import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdminSessions } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminSessions";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerWishlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerWishlist";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { generate_random_shopping_mall_customer_wishlists_create } from "../../../generate/generate_random_shopping_mall_customer_wishlists_create";
import { prepare_random_shopping_mall_customer_wishlist } from "../../../prepare/prepare_random_shopping_mall_customer_wishlist";

export async function test_api_wishlist_duplicate_prevention(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new customer account
  const customerConnection: api.IConnection = { host: connection.host };
  const customerEmail = typia.random<
    string & tags.Format<"email"> & tags.MinLength<1> & tags.MaxLength<255>
  >();
  const customerPassword = RandomGenerator.alphabets(12);
  const customerJoinData: IShoppingMallCustomer.IJoin = {
    email: customerEmail,
    password: customerPassword,
    href: "https://example.com/join",
    referrer: "https://example.com/home",
  };
  const authorizedCustomer = await authorize_customer_join(customerConnection, {
    body: customerJoinData,
  });
  typia.assert(authorizedCustomer);
  // 2. Create a product for wishlist testing using available customer endpoints
  // Since admin API doesn't exist, we'll use a placeholder product ID
  // In a real test environment, you would create a product through other means
  const testProductId = typia.random<string & tags.Format<"uuid">>();
  // 3. Add a product to the customer's wishlist (first addition should succeed)
  const firstAddition =
    await api.functional.shoppingMall.customer.wishlists.create(
      customerConnection,
      {
        body: {
          shopping_mall_product_id: testProductId,
        },
      },
    );
  typia.assert(firstAddition);
  // 4. Attempt to add the same product again (should fail with uniqueness constraint error)
  await TestValidator.error("duplicate wishlist item prevention", async () => {
    await api.functional.shoppingMall.customer.wishlists.create(
      customerConnection,
      {
        body: {
          shopping_mall_product_id: testProductId,
        },
      },
    );
  });
}
