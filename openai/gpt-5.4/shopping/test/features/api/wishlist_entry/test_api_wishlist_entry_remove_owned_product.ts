import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallWishlistEntry } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallWishlistEntry";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_shopping_mall_customer_wishlist_entries_create } from "../../../generate/generate_random_shopping_mall_customer_wishlist_entries_create";
import { generate_random_shopping_mall_seller_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_seller_products_create";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_wishlist_entry } from "../../../prepare/prepare_random_shopping_mall_wishlist_entry";

export async function test_api_wishlist_entry_remove_owned_product(
  connection: api.IConnection,
): Promise<void> {
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuthorized = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(sellerAuthorized);
  const product =
    await generate_random_shopping_mall_seller_seller_products_create(
      sellerConnection,
      {
        body: {
          shopping_mall_category_id: null,
          name: RandomGenerator.name(),
          description: RandomGenerator.content({ paragraphs: 2 }),
          base_price: typia.random<
            number & tags.Type<"uint32"> & tags.Minimum<1>
          >(),
          status: "active",
        },
      },
    );
  typia.assert(product);
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuthorized = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(customerAuthorized);
  const wishlistEntry =
    await generate_random_shopping_mall_customer_wishlist_entries_create(
      customerConnection,
      {
        body: {
          shopping_mall_product_id: product.id,
        },
      },
    );
  typia.assert(wishlistEntry);
  TestValidator.equals(
    "wishlist entry references created product",
    wishlistEntry.product.id,
    product.id,
  );
  TestValidator.equals(
    "wishlist entry belongs to authorized customer",
    wishlistEntry.customer.id,
    customerAuthorized.id,
  );
  await api.functional.shoppingMall.customer.wishlistEntries.erase(
    customerConnection,
    {
      wishlistEntryId: wishlistEntry.id,
    },
  );
  await TestValidator.error(
    "deleting the same wishlist entry twice should fail after removal",
    async () => {
      await api.functional.shoppingMall.customer.wishlistEntries.erase(
        customerConnection,
        {
          wishlistEntryId: wishlistEntry.id,
        },
      );
    },
  );
  const recreatedWishlistEntry =
    await generate_random_shopping_mall_customer_wishlist_entries_create(
      customerConnection,
      {
        body: {
          shopping_mall_product_id: product.id,
        },
      },
    );
  typia.assert(recreatedWishlistEntry);
  TestValidator.notEquals(
    "recreated wishlist entry has a new identifier",
    recreatedWishlistEntry.id,
    wishlistEntry.id,
  );
  TestValidator.equals(
    "recreated wishlist entry still references the same product",
    recreatedWishlistEntry.product.id,
    product.id,
  );
  TestValidator.equals(
    "recreated wishlist entry still belongs to the same customer",
    recreatedWishlistEntry.customer.id,
    customerAuthorized.id,
  );
  // Scenario correction: active wishlist listing, cart, order, and order-history
  // verification are intentionally omitted because no APIs for those resources
  // were provided in the available SDK/functions list.
}
