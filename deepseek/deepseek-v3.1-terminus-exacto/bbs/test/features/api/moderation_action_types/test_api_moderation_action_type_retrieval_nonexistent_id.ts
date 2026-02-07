import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardModerationActionType } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerationActionType";
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

/**
 * Test the behavior when attempting to retrieve a moderation action type with a non-existent UUID.
 * The scenario validates proper error handling and response when the provided actionTypeId does not
 * correspond to any existing moderation action type in the system. This tests the system's ability
 * to handle invalid identifiers gracefully.
 */
export async function test_api_moderation_action_type_retrieval_nonexistent_id(
  connection: api.IConnection,
): Promise<void> {
  // Create super administrator connection
  const superAdminConnection: api.IConnection = { host: connection.host };
  // Use SDK function directly since authorize_super_admin_join utility function is not available
  await api.functional.discussionBoard.auth.superAdmin.join(
    superAdminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: typia.random<string & tags.Format<"password">>(),
        privilege_level: "super_admin",
      } satisfies IDiscussionBoardSuperAdmin.IJoin,
    },
  );
  // Generate a non-existent UUID
  const nonExistentActionTypeId = typia.random<string & tags.Format<"uuid">>();
  // Attempt to retrieve moderation action type with non-existent ID
  await TestValidator.error(
    "retrieving non-existent moderation action type should fail",
    async () => {
      await api.functional.discussionBoard.superAdmin.moderation_action_types.at(
        superAdminConnection,
        {
          actionTypeId: nonExistentActionTypeId,
        },
      );
    },
  );
}
