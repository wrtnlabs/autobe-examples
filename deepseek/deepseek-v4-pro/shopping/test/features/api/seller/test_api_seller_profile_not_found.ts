import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

/**
 * Test that retrieving a non-existent seller profile returns HTTP 404.
 *
 * Authenticates as a customer and attempts to fetch a seller profile using a randomly generated UUID that does not correspond to any seller in the system. Validates that the endpoint correctly responds with HTTP 404 Not Found, confirming that no seller profile exists for the given identifier.
 */
export async function test_api_seller_profile_not_found(
  connection: api.IConnection,
): Promise<void> {
  // Authenticate as a customer
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {});
  // Attempt to retrieve a non-existent seller profile
  await TestValidator.httpError(
    "non-existent seller profile returns 404",
    404,
    async () =>
      await api.functional.shoppingMall.customer.profiles.at(
        customerConnection,
        {
          profileId: typia.random<string & tags.Format<"uuid">>(),
        },
      ),
  );
}
