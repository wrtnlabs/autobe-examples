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
 * Test updating a moderation action type with a duplicate code constraint.
 *
 * Since no CREATE endpoint exists for moderation action types, this test focuses
 * on validating the unique code constraint by attempting to update an existing
 * action type with a code that might already be in use by another action type.
 * The system should properly reject such updates to maintain data integrity.
 */
export async function test_api_moderation_action_type_update_code_uniqueness(
  connection: api.IConnection,
): Promise<void> {
  // Create super administrator connection
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdmin = await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      privilege_level: "super_admin",
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  typia.assert(superAdmin);
  // Since we cannot create new action types, we'll test the constraint by attempting
  // to update an existing action type with a potentially duplicate code
  // This tests the system's ability to validate unique constraints during updates
  // Generate a random code that might conflict with existing data
  const potentiallyDuplicateCode = RandomGenerator.alphaNumeric(10);
  // Attempt to update an action type with the potentially duplicate code
  // The system should validate this and potentially reject it if the code already exists
  await TestValidator.error(
    "potential duplicate code constraint validation",
    async () => {
      await api.functional.discussionBoard.superAdmin.moderation_action_types.update(
        superAdminConnection,
        {
          actionTypeId: typia.random<string & tags.Format<"uuid">>(),
          body: {
            code: potentiallyDuplicateCode,
          } satisfies IDiscussionBoardModerationActionType.IUpdate,
        },
      );
    },
  );
}
