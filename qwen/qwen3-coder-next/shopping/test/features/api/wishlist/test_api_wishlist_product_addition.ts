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

export async function test_api_wishlist_product_addition(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new customer account
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {
    body: {
      email: RandomGenerator.name(1) + "@" + RandomGenerator.name(1) + ".com",
      password: "1234",
      display_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      href: "https://example.com/join",
      referrer: "https://example.com/referrer",
    } satisfies IShoppingMallCustomer.IJoin,
  });
  typia.assert(customer);
  // 2. Prepare product data (simulated since no product creation API available)
  const product: IShoppingMallProduct.ISummary = {
    id: typia.random<string & tags.Format<"uuid">>(),
    name: RandomGenerator.name(),
    base_price: typia.random<
      number & tags.Type<"uint32"> & tags.Minimum<1000>
    >(),
    is_deleted: false,
    seller: {
      id: typia.random<string & tags.Format<"uuid">>(),
      shop_name: RandomGenerator.name(),
      approval_status: "approved",
      created_at: new Date().toISOString(),
    },
    category: {
      id: typia.random<string & tags.Format<"uuid">>(),
      name: RandomGenerator.name(),
      description: null,
      parent: null,
      subcategory_count: 0,
    },
    average_rating: 0,
  };
  // 3. Add the product to the customer's wishlist
  const wishlistItem =
    await api.functional.shoppingMall.customer.wishlists.create(
      customerConnection,
      {
        body: {
          shopping_mall_product_id: product.id,
        },
      },
    );
  typia.assert(wishlistItem);
  // 4. Verify the wishlist item is created with correct product ID
  TestValidator.equals(
    "product ID matches",
    wishlistItem.product.id,
    product.id,
  );
  // 5. Confirm response includes product details
  TestValidator.equals(
    "product name matches",
    wishlistItem.product.name,
    product.name,
  );
  TestValidator.equals(
    "base price matches",
    wishlistItem.product.base_price,
    product.base_price,
  );
  TestValidator.predicate(
    "has seller info",
    wishlistItem.product.seller !== null,
  );
  TestValidator.equals(
    "seller shop name matches",
    wishlistItem.product.seller.shop_name,
    product.seller.shop_name,
  );
  TestValidator.predicate(
    "has category info",
    wishlistItem.product.category !== null,
  );
  // 6. Validate the added_at timestamp is set to current time
  const addedAt = new Date(wishlistItem.added_at).getTime();
  const now = Date.now();
  const diff = Math.abs(now - addedAt);
  TestValidator.predicate("added_at is recent", diff < 5000); // Within 5 seconds
}
