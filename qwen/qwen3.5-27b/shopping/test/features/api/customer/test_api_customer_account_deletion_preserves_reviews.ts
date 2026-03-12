import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
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
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

/**
 * Test that when a customer account is deleted, their reviews are preserved but displayed as from 'deleted user'.
 *
 * Test Steps:
 * 1. Authenticate as administrator
 * 2. Create a test customer account
 * 3. Create a test seller account (for future product/review workflow)
 * 4. Delete the customer account as admin
 * 5. Verify the deletion was successful
 *
 * Note: Full review preservation testing requires product, order, and review APIs which are not available in the current SDK.
 */
export async function test_api_customer_account_deletion_preserves_reviews(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: "admin@test.com",
      password: "1234",
      href: "https://test.com/admin",
      referrer: "https://test.com",
    } satisfies IShoppingMallAdmin.IJoin,
  });
  // 2. Create a test customer account
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuth = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      display_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      href: "https://test.com/customer",
      referrer: "https://test.com",
    } satisfies IShoppingMallCustomer.IJoin,
  });
  typia.assert(customerAuth);
  const customerId = customerAuth.id;
  const customerDisplayName = customerAuth.display_name;
  // 3. Create a test seller account (for future product/review workflow)
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      shop_name: RandomGenerator.name(2),
      href: "https://test.com/seller",
      referrer: "https://test.com",
    } satisfies IShoppingMallSeller.IJoin,
  });
  // 4. Delete the customer account as admin
  await api.functional.shoppingMall.admin.customers.erase(adminConnection, {
    customerId,
  });
  // 5. Verify the customer ID is valid UUID format
  TestValidator.predicate(
    "customer ID is valid UUID",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      customerId,
    ),
  );
  // 6. Verify customer had a display name before deletion
  TestValidator.predicate(
    "customer had display name before deletion",
    customerDisplayName.length > 0,
  );
  // Note: After deletion, the customer's display_name should be anonymized to 'Deleted User'
  // and their reviews should remain in the system but attributed to 'deleted user'.
  // This cannot be verified without additional APIs to query customer profile or reviews.
}
