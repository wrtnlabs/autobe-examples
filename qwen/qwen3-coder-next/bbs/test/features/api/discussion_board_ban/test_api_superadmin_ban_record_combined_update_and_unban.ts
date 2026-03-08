import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardBanRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardBanRecord";
import type { IDiscussionBoardGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardGuest";
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

export async function test_api_superadmin_ban_record_combined_update_and_unban(
  connection: api.IConnection,
): Promise<void> {
  // Setup: Create super admin for testing authorization
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdmin = await api.functional.discussionBoard.auth.superAdmin.join(
    superAdminConnection,
    {
      body: typia.random<IDiscussionBoardSuperAdmin.IJoin>(),
    },
  );
  typia.assert(superAdmin);
  // Create a mock ban ID for testing the update endpoint
  const banId = typia.random<string & tags.Format<"uuid">>();
  // Generate random ban reason and unban reason for testing
  const newBanReason = RandomGenerator.paragraph({ sentences: 3 });
  const unbanReason = RandomGenerator.paragraph({ sentences: 2 });
  // Test combined update and unban operation
  const updatedBan =
    await api.functional.discussionBoard.superAdmin.bans.update(
      superAdminConnection,
      {
        banId: banId,
        body: {
          ban_reason: newBanReason,
          unban_reason: unbanReason,
        },
      },
    );
  typia.assert(updatedBan);
  // Validation: Check combined update properties
  TestValidator.equals("user exists", updatedBan.user.id !== null, true);
  TestValidator.equals(
    "administrator exists",
    updatedBan.administrator.id !== null,
    true,
  );
  TestValidator.equals(
    "ban_reason matches input",
    updatedBan.ban_reason,
    newBanReason,
  );
  TestValidator.equals(
    "unban_reason matches input",
    updatedBan.unban_reason,
    unbanReason,
  );
  TestValidator.predicate(
    "unbanned_at timestamp is set",
    () => updatedBan.unbanned_at !== null,
  );
  TestValidator.predicate(
    "updated_at timestamp is changed",
    () => updatedBan.updated_at !== null,
  );
  TestValidator.predicate(
    "created_at timestamp exists",
    () => updatedBan.created_at !== null,
  );
  TestValidator.predicate(
    "deleted_at is null",
    () => updatedBan.deleted_at === null,
  );
}
