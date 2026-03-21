import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCancellationRequest";
import type { IEcommerceMallCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCart";
import type { IEcommerceMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCartItem";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerProfile";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import type { IEcommerceMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshot";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOptionValue";
import type { IEcommerceMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallRefundRequest";
import type { IEcommerceMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallReview";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfile";
import type { IEcommerceMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfileSnapshot";
import type { IEcommerceMallShippingAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShippingAddress";
import type { IEcommerceMallWishlistItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallWishlistItem";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallWishlistItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallWishlistItem";
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
import { generate_random_ecommerce_mall_customer_customers_wishlist_create } from "../../../generate/generate_random_ecommerce_mall_customer_customers_wishlist_create";
import { generate_random_ecommerce_mall_seller_products_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_create";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";
import { prepare_random_ecommerce_mall_wishlist_item } from "../../../prepare/prepare_random_ecommerce_mall_wishlist_item";

export async function test_api_wishlist_search_and_sort(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create seller and approve for product creation
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {});
  // 2. Create customer for wishlist testing
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {});
  // 3. Seller creates 3 products with distinct names
  const productNames = ["Wireless Mouse", "Gaming Keyboard", "USB Hub"];
  const mouseProduct =
    await api.functional.ecommerceMall.seller.products.create(
      sellerConnection,
      {
        body: {
          name: "Wireless Mouse",
          description: RandomGenerator.paragraph({ sentences: 3 }),
          category_id: typia.random<string & tags.Format<"uuid">>(),
          base_price: typia.random<number & tags.Minimum<0>>(),
        } satisfies IEcommerceMallProduct.ICreate,
      },
    );
  typia.assert(mouseProduct);
  const keyboardProduct =
    await api.functional.ecommerceMall.seller.products.create(
      sellerConnection,
      {
        body: {
          name: "Gaming Keyboard",
          description: RandomGenerator.paragraph({ sentences: 3 }),
          category_id: typia.random<string & tags.Format<"uuid">>(),
          base_price: typia.random<number & tags.Minimum<0>>(),
        } satisfies IEcommerceMallProduct.ICreate,
      },
    );
  typia.assert(keyboardProduct);
  const hubProduct = await api.functional.ecommerceMall.seller.products.create(
    sellerConnection,
    {
      body: {
        name: "USB Hub",
        description: RandomGenerator.paragraph({ sentences: 3 }),
        category_id: typia.random<string & tags.Format<"uuid">>(),
        base_price: typia.random<number & tags.Minimum<0>>(),
      } satisfies IEcommerceMallProduct.ICreate,
    },
  );
  typia.assert(hubProduct);
  // 4. Customer adds all 3 products to wishlist
  await api.functional.ecommerceMall.customer.customers.wishlist.create(
    customerConnection,
    {
      body: {
        product_id: mouseProduct.id,
      } satisfies IEcommerceMallWishlistItem.ICreate,
    },
  );
  await api.functional.ecommerceMall.customer.customers.wishlist.create(
    customerConnection,
    {
      body: {
        product_id: keyboardProduct.id,
      } satisfies IEcommerceMallWishlistItem.ICreate,
    },
  );
  await api.functional.ecommerceMall.customer.customers.wishlist.create(
    customerConnection,
    {
      body: {
        product_id: hubProduct.id,
      } satisfies IEcommerceMallWishlistItem.ICreate,
    },
  );
  // 5. Customer retrieves wishlist with search='keyboard' filter
  const searchResult =
    await api.functional.ecommerceMall.customer.wishlist.index(
      customerConnection,
      {
        body: {
          search: "keyboard",
        } satisfies IEcommerceMallWishlistItem.IRequest,
      },
    );
  typia.assert(searchResult);
  // Validate only 'Gaming Keyboard' product is returned
  TestValidator.equals("search result count", searchResult.data.length, 1);
  TestValidator.equals(
    "search result product name",
    searchResult.data[0]!.product.name,
    "Gaming Keyboard",
  );
  // 6. Customer retrieves wishlist with sort_by=oldest
  const sortResult = await api.functional.ecommerceMall.customer.wishlist.index(
    customerConnection,
    {
      body: {
        sort_by: "oldest",
      } satisfies IEcommerceMallWishlistItem.IRequest,
    },
  );
  typia.assert(sortResult);
  // Validate all 3 items are returned
  TestValidator.equals("sort result count", sortResult.data.length, 3);
  // Validate items ordered by created_at ascending (oldest first)
  TestValidator.predicate("items sorted oldest first", () => {
    if (sortResult.data.length < 2) return true;
    for (let i = 1; i < sortResult.data.length; i++) {
      const prev = new Date(sortResult.data[i - 1]!.created_at).getTime();
      const curr = new Date(sortResult.data[i]!.created_at).getTime();
      if (prev > curr) return false;
    }
    return true;
  });
}
