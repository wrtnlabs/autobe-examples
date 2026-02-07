import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

export async function test_api_ban_record_unban_by_super_admin(
  connection: api.IConnection,
): Promise<void> {
  // Create super admin connection and authenticate
  const superAdminConnection: api.IConnection = { host: connection.host };
  // Register super admin
  const superAdmin = await api.functional.discussionBoard.auth.super_admin.join(
    superAdminConnection,
    {
      body: typia.random<IDiscussionBoardSuperAdmin.IJoin>(),
    },
  );
  typia.assert(superAdmin);
  // Use the token for subsequent requests
  const adminConnection: api.IConnection = {
    host: connection.host,
    headers: {
      authorization: superAdmin.token.access,
    },
  };
  // Create a ban record ID (mock UUID)
  const banRecordId = typia.random<string & tags.Format<"uuid">>();
  // Delete the ban record (unban) - this tests the super admin unban functionality
  await api.functional.discussionBoard.superAdmin.admins.bans.erase(
    adminConnection,
    {
      banRecordId: banRecordId,
    },
  );
}
