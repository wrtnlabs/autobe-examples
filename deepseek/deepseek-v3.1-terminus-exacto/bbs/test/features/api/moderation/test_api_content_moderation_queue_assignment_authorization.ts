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

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";
import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";
import { generate_random_discussion_board_user_content_flags_create } from "../../../generate/generate_random_discussion_board_user_content_flags_create";
import { prepare_random_discussion_board_content_flag } from "../../../prepare/prepare_random_discussion_board_content_flag";

/**
 * Test authorization validation for moderation queue assignment updates.
 * Verify that only super administrators can modify assignment details by attempting
 * updates with regular user credentials and ensuring proper authorization errors
 * are returned. Test that non-superAdmin users cannot reassign tasks, mark
 * assignments as completed, or modify any assignment parameters.
 */
export async function test_api_content_moderation_queue_assignment_authorization(
  connection: api.IConnection,
): Promise<void> {
  // Create regular user connection and authenticate
  const userConnection: api.IConnection = { host: connection.host };
  const userAuth = await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
    } satisfies IDiscussionBoardUser.IJoin,
  });
  // Create a content flag as regular user
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
  // Attempt to update moderation queue assignment with regular user (should fail)
  await TestValidator.error(
    "regular user should not be able to update moderation queue assignment",
    async () => {
      await api.functional.discussionBoard.superAdmin.content_flags.moderation_queues.assignments.updateAssignment(
        userConnection,
        {
          contentFlagId: contentFlag.id,
          queueId: typia.random<string & tags.Format<"uuid">>(),
          body: {
            assigned_admin_id: null,
            completed_at: new Date().toISOString(),
          } satisfies IDiscussionBoardContentModerationQueueAssignment.IUpdate,
        },
      );
    },
  );
  // Create super admin connection and authenticate
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      privilege_level: "super_admin",
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  // Successfully update moderation queue assignment with super admin
  const assignmentUpdate =
    await api.functional.discussionBoard.superAdmin.content_flags.moderation_queues.assignments.updateAssignment(
      superAdminConnection,
      {
        contentFlagId: contentFlag.id,
        queueId: typia.random<string & tags.Format<"uuid">>(),
        body: {
          assigned_admin_id: null,
          completed_at: new Date().toISOString(),
        } satisfies IDiscussionBoardContentModerationQueueAssignment.IUpdate,
      },
    );
  typia.assert(assignmentUpdate);
  // Validate that super admin operation was successful
  TestValidator.predicate(
    "super admin should be able to update assignment",
    assignmentUpdate.id !== undefined,
  );
}
