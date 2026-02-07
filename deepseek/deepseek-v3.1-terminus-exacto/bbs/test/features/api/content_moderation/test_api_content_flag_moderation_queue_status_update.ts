import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardContentModerationQueue } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardContentModerationQueue";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

export async function test_api_content_flag_moderation_queue_status_update(
  connection: api.IConnection,
): Promise<void> {
  // Create super admin connection and authenticate
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdmin = await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      privilege_level: "super_admin",
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  typia.assert(superAdmin);
  // Generate a random content flag ID for testing
  const contentFlagId = typia.random<string & tags.Format<"uuid">>();
  // Test basic moderation queue update with available fields
  const updateBody: IDiscussionBoardContentModerationQueue.IUpdate = {
    moderation_status: "pending",
  };
  const updatedQueue =
    await api.functional.discussionBoard.superAdmin.content_flags.moderation_queues.patchByContentflagid(
      superAdminConnection,
      {
        contentFlagId,
        body: updateBody,
      },
    );
  typia.assert(updatedQueue);
  // Test partial update with priority level
  const priorityUpdateBody: IDiscussionBoardContentModerationQueue.IUpdate = {
    priority_level: "normal",
  };
  const priorityUpdatedQueue =
    await api.functional.discussionBoard.superAdmin.content_flags.moderation_queues.patchByContentflagid(
      superAdminConnection,
      {
        contentFlagId,
        body: priorityUpdateBody,
      },
    );
  typia.assert(priorityUpdatedQueue);
  // Test updating escalation reason
  const escalationUpdateBody: IDiscussionBoardContentModerationQueue.IUpdate = {
    escalation_reason: "Test escalation reason",
  };
  const escalationUpdatedQueue =
    await api.functional.discussionBoard.superAdmin.content_flags.moderation_queues.patchByContentflagid(
      superAdminConnection,
      {
        contentFlagId,
        body: escalationUpdateBody,
      },
    );
  typia.assert(escalationUpdatedQueue);
  // Test null assignment for nullable fields
  const nullAssignmentBody: IDiscussionBoardContentModerationQueue.IUpdate = {
    escalation_reason: null,
  };
  const nullAssignmentQueue =
    await api.functional.discussionBoard.superAdmin.content_flags.moderation_queues.patchByContentflagid(
      superAdminConnection,
      {
        contentFlagId,
        body: nullAssignmentBody,
      },
    );
  typia.assert(nullAssignmentQueue);
  // Test empty update (should still work as partial update)
  const emptyUpdateBody: IDiscussionBoardContentModerationQueue.IUpdate = {};
  const emptyUpdatedQueue =
    await api.functional.discussionBoard.superAdmin.content_flags.moderation_queues.patchByContentflagid(
      superAdminConnection,
      {
        contentFlagId,
        body: emptyUpdateBody,
      },
    );
  typia.assert(emptyUpdatedQueue);
}
