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

export async function test_api_content_flag_moderation_queue_priority_escalation(
  connection: api.IConnection,
): Promise<void> {
  // Create super admin connection
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      privilege_level: "super_admin",
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  // Generate a random content flag ID for testing
  const contentFlagId = typia.random<string & tags.Format<"uuid">>();
  // Test priority escalation from moderate to high with escalation reason
  const updateBody = {
    priority_level: "high",
    escalation_reason: "Urgent content violation requiring immediate attention",
  } satisfies IDiscussionBoardContentModerationQueue.IUpdate;
  const updatedQueue =
    await api.functional.discussionBoard.superAdmin.content_flags.moderation_queues.patchByContentflagid(
      superAdminConnection,
      {
        contentFlagId,
        body: updateBody,
      },
    );
  typia.assert(updatedQueue);
  // The typia.assert above validates the response is properly structured
  // Since IDiscussionBoardContentModerationQueue is an empty object,
  // we can only validate that the update operation completed successfully
}
