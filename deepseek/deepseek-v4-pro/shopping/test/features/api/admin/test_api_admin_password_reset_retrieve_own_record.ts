import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminPasswordReset";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test that an administrator can retrieve their own password reset record.
 *
 * Validates the password reset record retrieval endpoint returns all required fields defined in the IShoppingMallAdminPasswordReset schema. The test authenticates an administrator via the join flow, then retrieves a password reset record associated with the authenticated administrator's account.
 *
 * 1. Administrator registers and authenticates via authorize_admin_join, obtaining their account ID and JWT tokens.
 * 2. Retrieves the password reset record using the administrator's own ID and a generated reset UUID.
 * 3. Validates the response structure with typia.assert, confirming all fields: id (UUID), token (reset token string), ip (request IP address), created_at (creation timestamp), expired_at (expiration timestamp), and the nested admin summary object with id, email, grade, created_at, updated_at, and deleted_at.
 */
export async function test_api_admin_password_reset_retrieve_own_record(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {});
  // 2. Retrieve password reset record
  const reset =
    await api.functional.shoppingMall.admin.admins.password_resets.at(
      adminConnection,
      {
        adminId: admin.id,
        resetId: typia.random<string & tags.Format<"uuid">>(),
      },
    );
  typia.assert(reset);
}
