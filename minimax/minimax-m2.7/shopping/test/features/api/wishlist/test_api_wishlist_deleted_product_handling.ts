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

export async function test_api_wishlist_deleted_product_handling(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate customer
  const customerAuth = await authorize_customer_join(connection, {});
  const customerConnection: api.IConnection = {
    host: connection.host,
    headers: { Authorization: customerAuth.token.access },
  };
  // 1. Register and authenticate seller
  const sellerAuth = await authorize_seller_join(connection, {});
  const sellerConnection: api.IConnection = {
    host: connection.host,
    headers: { Authorization: sellerAuth.token.access },
  };
  // 2. Seller creates 2 products
  const product1 = await generate_random_ecommerce_mall_seller_products_create(
    sellerConnection,
    {},
  );
  typia.assert(product1);
  const product2 = await generate_random_ecommerce_mall_seller_products_create(
    sellerConnection,
    {},
  );
  typia.assert(product2);
  // 3. Customer adds both products to wishlist
  const wishlistItem1 =
    await generate_random_ecommerce_mall_customer_customers_wishlist_create(
      customerConnection,
      {
        body: { product_id: product1.id },
      },
    );
  typia.assert(wishlistItem1);
  TestValidator.equals(
    "wishlist item 1 has product1",
    wishlistItem1.product.id,
    product1.id,
  );
  const wishlistItem2 =
    await generate_random_ecommerce_mall_customer_customers_wishlist_create(
      customerConnection,
      {
        body: { product_id: product2.id },
      },
    );
  typia.assert(wishlistItem2);
  TestValidator.equals(
    "wishlist item 2 has product2",
    wishlistItem2.product.id,
    product2.id,
  );
  // 4. Customer retrieves wishlist
  const wishlist = await api.functional.ecommerceMall.customer.wishlist.index(
    customerConnection,
    {
      body: {
        sort_by: "newest",
        page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
        limit: 20 as number &
          tags.Type<"int32"> &
          tags.Minimum<1> &
          tags.Maximum<100>,
      } satisfies IEcommerceMallWishlistItem.IRequest,
    },
  );
  typia.assert(wishlist);
  // 5. Validate wishlist contains both products
  TestValidator.equals("wishlist has 2 items", wishlist.data.length, 2);
  // Verify both products are in wishlist (order may vary based on sort_by)
  const productIds = wishlist.data.map((item) => item.product.id);
  TestValidator.predicate(
    "contains product1",
    productIds.includes(product1.id),
  );
  TestValidator.predicate(
    "contains product2",
    productIds.includes(product2.id),
  );
}
