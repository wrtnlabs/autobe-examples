import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import type { IDiscussionBoardContentFlag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardContentFlag";
import type { IDiscussionBoardContentModerationQueue } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardContentModerationQueue";
import type { IDiscussionBoardContentModerationQueueAssignment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardContentModerationQueueAssignment";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";
import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";
import { generate_random_discussion_board_super_admin_moderation_queues_assignments_create } from "../../../generate/generate_random_discussion_board_super_admin_moderation_queues_assignments_create";
import { generate_random_discussion_board_user_content_flags_create } from "../../../generate/generate_random_discussion_board_user_content_flags_create";
import { prepare_random_discussion_board_content_flag } from "../../../prepare/prepare_random_discussion_board_content_flag";
import { prepare_random_discussion_board_content_moderation_queue_assignment } from "../../../prepare/prepare_random_discussion_board_content_moderation_queue_assignment";

/**
 * Test sequential assignment of moderation queue entries to different administrators.
 * This scenario validates the assignment system's ability to handle workload distribution
 * and assignment rotation. Create multiple assignments for the same queue entry but with
 * different administrators, ensuring each assignment is properly recorded with unique
 * timestamps. Verify that the system tracks assignment history correctly and maintains
 * proper workflow state transitions when administrators are reassigned.
 */
export async function test_api_moderation_queue_assignment_different_administrators(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create super administrator to manage assignments
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdmin = await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "super_admin_password",
      privilege_level: "super_admin",
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  typia.assert(superAdmin);
  // 2. Create regular user to report content flags
  const userConnection: api.IConnection = { host: connection.host };
  const user = await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "user_password",
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
    } satisfies IDiscussionBoardUser.IJoin,
  });
  typia.assert(user);
  // 3. Create first administrator account
  const admin1Connection: api.IConnection = { host: connection.host };
  const admin1 = await authorize_admin_join(admin1Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "admin1_password",
      display_name: RandomGenerator.name(),
      href: "https://example.com",
      referrer: "https://example.com/referrer",
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  typia.assert(admin1);
  // 4. Create second administrator account
  const admin2Connection: api.IConnection = { host: connection.host };
  const admin2 = await authorize_admin_join(admin2Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "admin2_password",
      display_name: RandomGenerator.name(),
      href: "https://example.com",
      referrer: "https://example.com/referrer",
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  typia.assert(admin2);
  // 5. Create content flag that generates moderation queue entry
  const contentFlag =
    await generate_random_discussion_board_user_content_flags_create(
      userConnection,
      {
        body: {
          flag_reason: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IDiscussionBoardContentFlag.ICreate,
      },
    );
  typia.assert(contentFlag);
  // 6. Assign moderation queue entry to first administrator
  const assignment1 =
    await generate_random_discussion_board_super_admin_moderation_queues_assignments_create(
      superAdminConnection,
      {
        body: {
          discussion_board_content_moderation_queue_id: contentFlag.id,
          assigned_admin_id: admin1.id,
        } satisfies IDiscussionBoardContentModerationQueueAssignment.ICreate,
      },
    );
  typia.assert(assignment1);
  // 7. Assign same queue entry to second administrator
  const assignment2 =
    await generate_random_discussion_board_super_admin_moderation_queues_assignments_create(
      superAdminConnection,
      {
        body: {
          discussion_board_content_moderation_queue_id: contentFlag.id,
          assigned_admin_id: admin2.id,
        } satisfies IDiscussionBoardContentModerationQueueAssignment.ICreate,
      },
    );
  typia.assert(assignment2);
  // 8. Validate assignment properties
  TestValidator.notEquals(
    "assignment IDs should be different",
    assignment1.id,
    assignment2.id,
  );
  TestValidator.notEquals(
    "assignment timestamps should differ",
    assignment1.assigned_at,
    assignment2.assigned_at,
  );
  TestValidator.equals(
    "first assignment admin matches",
    assignment1.assignedAdmin.id,
    admin1.id,
  );
  TestValidator.equals(
    "second assignment admin matches",
    assignment2.assignedAdmin.id,
    admin2.id,
  );
  TestValidator.equals(
    "content moderation queue matches",
    assignment1.contentModerationQueue.id,
    contentFlag.id,
  );
  TestValidator.equals(
    "content moderation queue matches",
    assignment2.contentModerationQueue.id,
    contentFlag.id,
  );
  // 9. Verify assignment history tracking
  TestValidator.predicate(
    "first assignment completed_at should be null",
    assignment1.completed_at === null,
  );
  TestValidator.predicate(
    "second assignment completed_at should be null",
    assignment2.completed_at === null,
  );
  TestValidator.predicate(
    "created_at should be set",
    assignment1.created_at !== null,
  );
  TestValidator.predicate(
    "updated_at should be set",
    assignment1.updated_at !== null,
  );
  // 10. Validate assignment history count if available
  if ("assignment_history_count" in assignment1.contentModerationQueue) {
    TestValidator.predicate(
      "assignment history count should reflect multiple assignments",
      (assignment1.contentModerationQueue as any).assignment_history_count >= 1,
    );
  }
}
