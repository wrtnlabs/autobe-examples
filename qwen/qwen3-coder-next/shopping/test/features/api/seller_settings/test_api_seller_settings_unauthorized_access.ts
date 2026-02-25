import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdminSessions } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminSessions";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallSellerSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerSetting";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

/**
 * Test unauthorized access attempt where a customer tries to retrieve another seller's configuration settings.
 * The customer should not have permission to view seller-specific shop configuration settings and the system should return an appropriate authorization error.
 */
export async function test_api_seller_settings_unauthorized_access(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Register a customer (unauthorized user)
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await api.functional.shoppingMall.auth.customer.join(
    customerConnection,
    {
      body: {
        email: typia.random<string>() satisfies string & tags.Format<"email">,
        password: "1234",
        href: "https://example.com/register",
        referrer: "https://example.com",
      } satisfies IShoppingMallCustomer.IJoin,
    },
  );
  typia.assert(customer);
  // Update connection with customer's token
  customerConnection.headers = customerConnection.headers ?? {};
  customerConnection.headers.Authorization = customer.token.access;
  // Step 2: Try to access seller settings (should fail with authorization error)
  // Note: We use a seller ID that doesn't belong to the customer
  let errorThrown = false;
  try {
    await api.functional.shoppingMall.sellers.settings.at(customerConnection, {
      sellerId: typia.random<string & tags.Format<"uuid">>(),
    });
  } catch {
    errorThrown = true;
  }
  TestValidator.predicate("Unauthorized access error thrown", errorThrown === true);
}