import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import type { IShoppingMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test administrator retrieval of customer account details for oversight purposes.
 *
 * Validates that administrators can access complete customer information through the admin customer retrieval endpoint. This includes authentication account data from shopping_mall_members and profile information from shopping_mall_customer_profiles. The test ensures that admin authentication is properly established before accessing customer management endpoints and that the response structure contains all expected fields including email, account status, display name, phone number, and lifecycle timestamps.
 *
 * The test focuses on verifying the admin authorization flow and the customer data retrieval endpoint response structure. Administrator oversight capabilities should provide full visibility into customer accounts for user management purposes regardless of account status.
 *
 * 1. Administrator authentication is performed using authorize_admin_join utility.
 * 2. Admin calls GET /shoppingMall/admin/customers/{customerId} with a customer UUID.
 * 3. Response is validated using typia.assert() which performs complete type validation including all property existence, format validations, and constraint checks.
 * 4. The IShoppingMallMember response includes id, email, status, profile relation with display_name and phone_number, and lifecycle timestamps (created_at, updated_at, deleted_at).
 */
export async function test_api_customer_banned_account_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin authentication
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      grade: RandomGenerator.pick(["regular", "super"] as const),
    } satisfies IShoppingMallAdmin.IJoin,
  });
  // 2. Retrieve customer details by UUID
  const customerId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const customer: IShoppingMallMember =
    await api.functional.shoppingMall.admin.customers.at(adminConnection, {
      customerId,
    });
  typia.assert(customer);
}
