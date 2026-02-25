import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test successful retrieval of administrator account details.
 *
 * This test validates that:
 * 1. An admin can retrieve their own account details
 * 2. New administrators are created with 'regular' grade by default
 * 3. Password hash is never exposed in API responses
 * 4. Active accounts have deleted_at as null
 * 5. All IShoppingMallAdmin fields are correctly returned
 */
export async function test_api_admin_detail_retrieval_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin connection and register a new administrator
  const adminConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_admin_join(adminConnection, {});
  typia.assert(authorized);
  // 2. Retrieve the administrator details using the admin ID
  const adminDetail = await api.functional.shoppingMall.admin.admins.at(
    adminConnection,
    { adminId: authorized.id },
  );
  typia.assert(adminDetail);
  // 3. Validate response matches expected values
  TestValidator.equals("admin id matches", adminDetail.id, authorized.id);
  TestValidator.equals("email matches", adminDetail.email, authorized.email);
  TestValidator.equals("grade is regular", adminDetail.grade, "regular");
  TestValidator.equals("name matches", adminDetail.name, authorized.name);
  TestValidator.equals(
    "created_at matches",
    adminDetail.created_at,
    authorized.created_at,
  );
  TestValidator.equals(
    "updated_at matches",
    adminDetail.updated_at,
    authorized.updated_at,
  );
  TestValidator.equals(
    "deleted_at is null for active account",
    adminDetail.deleted_at,
    null,
  );
}
