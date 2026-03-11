import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

/**
 * Test scenario where a seller views a customer profile with all optional fields set to null.
 * This validates the system's handling of customers who have not provided display name
 * or phone number information.
 */
export async function test_api_customer_profile_null_fields(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create seller account and authenticate
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      shopName: RandomGenerator.name(1),
    },
  });
  typia.assert(seller);
  // 2. Call GET /shoppingMall/seller/customers/profile
  const profile =
    await api.functional.shoppingMall.seller.customers.profile.at(
      sellerConnection,
    );
  typia.assert(profile);
  // 3. Verify null values for optional fields
  TestValidator.equals("displayName is null", profile.displayName, null);
  TestValidator.equals("phoneNumber is null", profile.phoneNumber, null);
}
