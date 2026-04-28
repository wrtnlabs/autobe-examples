import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommercePlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformAdmin";
import type { IEcommercePlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformCategory";
import type { IEcommercePlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformCustomer";
import type { IEcommercePlatformCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformCustomerProfile";
import type { IEcommercePlatformOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformOrder";
import type { IEcommercePlatformOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformOrderItem";
import type { IEcommercePlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformProduct";
import type { IEcommercePlatformProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformProductImage";
import type { IEcommercePlatformProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformProductVariant";
import type { IEcommercePlatformProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformProductVariantOption";
import type { IEcommercePlatformReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformReview";
import type { IEcommercePlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformSeller";
import type { IEcommercePlatformSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformSellerProfile";
import type { IEcommercePlatformShippingAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformShippingAddress";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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
import { generate_random_ecommerce_platform_admin_categories_create } from "../../../generate/generate_random_ecommerce_platform_admin_categories_create";
import { generate_random_ecommerce_platform_customer_addresses_create } from "../../../generate/generate_random_ecommerce_platform_customer_addresses_create";
import { generate_random_ecommerce_platform_customer_orders_create } from "../../../generate/generate_random_ecommerce_platform_customer_orders_create";
import { generate_random_ecommerce_platform_seller_products_create } from "../../../generate/generate_random_ecommerce_platform_seller_products_create";
import { generate_random_ecommerce_platform_seller_products_variants_create } from "../../../generate/generate_random_ecommerce_platform_seller_products_variants_create";
import { prepare_random_ecommerce_platform_category } from "../../../prepare/prepare_random_ecommerce_platform_category";
import { prepare_random_ecommerce_platform_order } from "../../../prepare/prepare_random_ecommerce_platform_order";
import { prepare_random_ecommerce_platform_order_item } from "../../../prepare/prepare_random_ecommerce_platform_order_item";
import { prepare_random_ecommerce_platform_product } from "../../../prepare/prepare_random_ecommerce_platform_product";
import { prepare_random_ecommerce_platform_product_variant } from "../../../prepare/prepare_random_ecommerce_platform_product_variant";
import { prepare_random_ecommerce_platform_product_variant_option } from "../../../prepare/prepare_random_ecommerce_platform_product_variant_option";
import { prepare_random_ecommerce_platform_shipping_address } from "../../../prepare/prepare_random_ecommerce_platform_shipping_address";

/**
 * Test customer review rating-only update preserving text content.
 *
 * Validates the complete review update flow including administrative category creation, seller product and variant creation, customer address and order setup, and initial review submission. The customer then performs a partial update changing only the star rating while omitting the text content field.
 *
 * Special attention is given to verifying that the text_content remains unchanged after the rating-only update, that the updated_at timestamp is refreshed, and that the original review text is preserved intact.
 *
 * 1. Admin registers and creates a product category.
 * 2. Seller registers and creates a product with category assignment, then creates a variant.
 * 3. Customer registers and creates a shipping address.
 * 4. Customer places an order containing the variant.
 * 5. Customer submits an initial review with text content.
 * 6. Customer updates only the rating field to 5, omitting text_content.
 * 7. Validates the updated review has new rating 5, unchanged text_content, and refreshed updated_at.
 */
export async function test_api_review_update_rating_only(
  connection: api.IConnection,
) {
  // 1. Admin: register and create category
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  const category =
    await generate_random_ecommerce_platform_admin_categories_create(
      adminConnection,
      {
        body: {
          name: "Test Category",
          description: RandomGenerator.paragraph({ sentences: 2 }),
        },
      },
    );
  typia.assert(category);
  // 2. Seller: register and create product + variant
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {});
  const product =
    await generate_random_ecommerce_platform_seller_products_create(
      sellerConnection,
      {
        body: { category_id: category.id },
      },
    );
  typia.assert(product);
  const variant =
    await generate_random_ecommerce_platform_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: { skuCode: "TEST-VARIANT-001" },
      },
    );
  typia.assert(variant);
  // 3. Customer: register and create shipping address
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {});
  const address =
    await generate_random_ecommerce_platform_customer_addresses_create(
      customerConnection,
      {},
    );
  typia.assert(address);
  // 4. Order: customer places order with the specific variant
  const shipping_address_id = address.id;
  const ecommerce_platform_product_variant_id = variant.id;
  const quantity: number & tags.Type<"int32"> & tags.Minimum<1> = 1;
  const price: number & tags.Minimum<0> = product.base_price ?? 1000;
  const items: IEcommercePlatformOrderItem.ICreate[] = [
    {
      ecommerce_platform_product_variant_id,
      quantity,
      price,
    },
  ];
  const orderBody = {
    items,
    shipping_address_id,
  } satisfies IEcommercePlatformOrder.ICreate;
  const order = await generate_random_ecommerce_platform_customer_orders_create(
    customerConnection,
    {
      body: orderBody,
    },
  );
  typia.assert(order);
  // 5. Submit initial review with text content
  const initialReviewBody = {
    productId: product.id,
    orderId: order.id,
  } satisfies IEcommercePlatformReview.IRequest;
  const initialReview =
    await api.functional.ecommercePlatform.customer.reviews.submit(
      customerConnection,
      {
        body: initialReviewBody,
      },
    );
  typia.assert(initialReview);
  // 6. Update only the rating to 5, omitting text_content for partial update
  const newRating: number &
    tags.Type<"int32"> &
    tags.Minimum<1> &
    tags.Maximum<5> = 5;
  const updateBody = {
    rating: newRating,
  } satisfies IEcommercePlatformReview.IUpdate;
  const updatedReview =
    await api.functional.ecommercePlatform.customer.reviews.update(
      customerConnection,
      {
        reviewId: initialReview.id,
        body: updateBody,
      },
    );
  typia.assert(updatedReview);
  // 7. Validate: rating changed, text_content preserved, updated_at refreshed
  TestValidator.equals("rating updated to 5", updatedReview.rating, newRating);
  TestValidator.equals(
    "text content unchanged",
    updatedReview.textContent,
    initialReview.textContent,
  );
  TestValidator.notEquals(
    "updated_at refreshed",
    initialReview.updatedAt,
    updatedReview.updatedAt,
  );
}
