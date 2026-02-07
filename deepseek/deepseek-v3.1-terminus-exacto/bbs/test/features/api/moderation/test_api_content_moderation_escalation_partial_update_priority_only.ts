import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import type { IDiscussionBoardContentFlag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardContentFlag";
import type { IDiscussionBoardContentModerationQueue } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardContentModerationQueue";
import type { IDiscussionBoardContentModerationQueueAssignment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardContentModerationQueueAssignment";
import type { IDiscussionBoardContentModerationQueueEscalation } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardContentModerationQueueEscalation";
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
import { generate_random_discussion_board_admin_moderation_queues_assignments_create } from "../../../generate/generate_random_discussion_board_admin_moderation_queues_assignments_create";
import { generate_random_discussion_board_user_content_flags_create } from "../../../generate/generate_random_discussion_board_user_content_flags_create";
import { prepare_random_discussion_board_content_flag } from "../../../prepare/prepare_random_discussion_board_content_flag";
import { prepare_random_discussion_board_content_moderation_queue_assignment } from "../../../prepare/prepare_random_discussion_board_content_moderation_queue_assignment";

export async function test_api_content_moderation_escalation_partial_update_priority_only(
  connection: api.IConnection,
): Promise<void> {
  // Create user account to report content
  const userConnection: api.IConnection = { host: connection.host };
  const userJoin = await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
    } satisfies IDiscussionBoardUser.IJoin,
  });
  typia.assert(userJoin);
  // Login as user to establish session
  const userLoginConn: api.IConnection = { host: connection.host };
  await authorize_user_login(userLoginConn, {
    body: {
      email: userJoin.email,
      password: "password123",
    } satisfies IDiscussionBoardUser.ILogin,
  });
  // Create content flag as the authenticated user
  const contentFlag =
    await generate_random_discussion_board_user_content_flags_create(
      userLoginConn,
      {
        body: {
          flag_reason: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IDiscussionBoardContentFlag.ICreate,
      },
    );
  typia.assert(contentFlag);
  // Create admin account for moderation assignment
  const adminConnection: api.IConnection = { host: connection.host };
  const adminJoin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "admin123",
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  typia.assert(adminJoin);
  // Login as admin to establish session
  const adminLoginConn: api.IConnection = { host: connection.host };
  await authorize_admin_login(adminLoginConn, {
    body: {
      email: adminJoin.email,
      password: "admin123",
    } satisfies IDiscussionBoardAdmin.ILogin,
  });
  // Create moderation queue assignment linking content flag to admin
  const assignment =
    await generate_random_discussion_board_admin_moderation_queues_assignments_create(
      adminLoginConn,
      {
        body: {
          discussion_board_content_moderation_queue_id: contentFlag.id,
          assigned_admin_id: adminJoin.id,
        } satisfies IDiscussionBoardContentModerationQueueAssignment.ICreate,
      },
    );
  typia.assert(assignment);
  // Create super admin account for escalation update
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdminJoin = await authorize_super_admin_join(
    superAdminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "superadmin123",
        privilege_level: "super_admin",
      } satisfies IDiscussionBoardSuperAdmin.IJoin,
    },
  );
  typia.assert(superAdminJoin);
  // Login as super admin to establish session
  const superAdminLoginConn: api.IConnection = { host: connection.host };
  await authorize_super_admin_login(superAdminLoginConn, {
    body: {
      email: superAdminJoin.email,
      password: "superadmin123",
    } satisfies IDiscussionBoardSuperAdmin.ILogin,
  });
  // Perform partial update - only changing priority from 'low' to 'critical'
  const updateBody: IDiscussionBoardContentModerationQueueEscalation.IUpdate = {
    previous_priority: "low",
    new_priority: "critical",
  };
  const updatedEscalation =
    await api.functional.discussionBoard.superAdmin.content_flags.moderation_queues.escalations.update(
      superAdminLoginConn,
      {
        contentFlagId: contentFlag.id,
        queueId: assignment.contentModerationQueue.id,
        body: updateBody,
      },
    );
  typia.assert(updatedEscalation);
  // Validate that only the priority fields were updated as specified
  TestValidator.equals(
    "new priority should be updated to critical",
    updatedEscalation.newPriority,
    "critical",
  );
  TestValidator.equals(
    "previous priority should be set to low",
    updatedEscalation.previousPriority,
    "low",
  );
  // Validate that other fields are preserved (should have default or existing values)
  TestValidator.predicate(
    "escalation ID should be valid UUID",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      updatedEscalation.id,
    ),
  );
  TestValidator.predicate(
    "moderation queue reference should be preserved",
    updatedEscalation.moderationQueue.id ===
      assignment.contentModerationQueue.id,
  );
  TestValidator.predicate(
    "escalation timestamp should be valid",
    !isNaN(new Date(updatedEscalation.escalationTimestamp).getTime()),
  );
  TestValidator.predicate(
    "creation timestamp should be valid",
    !isNaN(new Date(updatedEscalation.createdAt).getTime()),
  );
  TestValidator.predicate(
    "update timestamp should be valid",
    !isNaN(new Date(updatedEscalation.updatedAt).getTime()),
  );
}
