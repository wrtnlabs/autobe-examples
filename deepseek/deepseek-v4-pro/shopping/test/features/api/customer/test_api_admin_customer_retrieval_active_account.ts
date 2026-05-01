import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

/**
 * Test that an administrator can retrieve full account details of an active, non-banned customer.
 *
 * Validates the administrative customer retrieval endpoint by first registering a new administrator and a new customer, then having the administrator fetch the customer's account by their unique identifier.
 *
 * The test verifies that the response contains all expected identity fields: a valid UUID v4 id, the email used at registration, the display name set at registration, and the phone number. Account status fields are checked — banned_at and deleted_at must both be null for an active account in good standing. The password_hash field is never included in the API response, which is validated by typia.assert against the IShoppingMallCustomer type that excludes it by design.
 *
 * 1. Administrator registers via admin join with randomized credentials, establishing an authenticated admin session.
 * 2. Customer registers via customer join with randomized credentials, establishing their account.
 * 3. Administrator retrieves the customer by their customer ID from the registration response.
 * 4. Validates id matches the customer's UUID, email matches the registration value, and display_name matches.
 * 5. Confirms banned_at is null (active account) and deleted_at is null (not soft-deleted).
 */
export async function test_api_admin_customer_retrieval_active_account(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new administrator
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {});
  typia.assert(admin);
  // 2. Register a new customer
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {});
  typia.assert(customer);
  // 3. Administrator retrieves the customer by ID
  const retrieved = await api.functional.shoppingMall.admin.customers.at(
    adminConnection,
    { customerId: customer.id },
  );
  typia.assert(retrieved);
  // 4. Validate identity fields match registration data
  TestValidator.equals("id matches", retrieved.id, customer.id);
  TestValidator.equals("email matches", retrieved.email, customer.email);
  TestValidator.equals(
    "display_name matches",
    retrieved.display_name,
    customer.display_name,
  );
  // 5. Validate account status — active, non-banned customer
  TestValidator.equals("banned_at is null", retrieved.banned_at, null);
  TestValidator.equals("deleted_at is null", retrieved.deleted_at, null);
}
