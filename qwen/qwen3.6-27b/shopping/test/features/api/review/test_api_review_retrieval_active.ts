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
 * Test retrieval of an active product review by its unique identifier.
 *
 * Validates the complete review retrieval flow including administrative category setup, seller product and variant creation, customer registration with shipping address and order placement, and review submission. After successfully creating a review, retrieves that same review using the returned reviewId via the GET endpoint. Ensures that the retrieved review record contains all expected fields including star rating, optional text content, associated product summary, order summary, and reviewer identity.
 *
 * Special attention is given to verifying that the deletedAt field is null for an active (non-deleted) review, confirming the review is currently visible and not soft-deleted.
 *
 * 1. Administrator joins and creates a category for product classification.
 * 2. Seller joins and creates a product in that category.
 * 3. Seller creates a product variant for the product.
 * 4. Customer joins and creates a shipping address for order checkout.
 * 5. Customer creates an order containing the product variant.
 * 6. Customer submits a review for the purchased product with rating and text.
 * 7. Retrieve the review using its unique identifier.
 * 8. Validate all review fields match expected values and deletedAt is null.
 */
export async function test_api_review_retrieval_active(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin joins and creates category
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  const category =
    await generate_random_ecommerce_platform_admin_categories_create(
      adminConnection,
      {},
    );
  typia.assert(category);
  // 2. Seller joins and creates product
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {});
  const product =
    await generate_random_ecommerce_platform_seller_products_create(
      sellerConnection,
      { body: { category_id: category.id } },
    );
  typia.assert(product);
  // 3. Seller creates product variant
  const variant =
    await generate_random_ecommerce_platform_seller_products_variants_create(
      sellerConnection,
      { params: { productId: product.id } },
    );
  typia.assert(variant);
  // 4. Customer joins and creates shipping address
  const customerConnection: api.IConnection = { host: connection.host };
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customerPassword = RandomGenerator.alphaNumeric(16);
  await authorize_customer_join(customerConnection, {
    body: { email: customerEmail, password: customerPassword },
  });
  const address =
    await generate_random_ecommerce_platform_customer_addresses_create(
      customerConnection,
      {},
    );
  typia.assert(address);
  // 5. Customer creates order with the product variant
  const variantPrice = variant.price ?? product.base_price;
  const order = await generate_random_ecommerce_platform_customer_orders_create(
    customerConnection,
    {
      body: {
        shipping_address_id: address.id,
        items: [
          {
            ecommerce_platform_product_variant_id: variant.id,
            quantity: 1,
            price: variantPrice,
          },
        ],
      },
    },
  );
  typia.assert(order);
  // 6. Customer submits a review for the purchased product
  const rating = typia.random<
    number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<5>
  >();
  const textContent = RandomGenerator.paragraph({ sentences: 3 });
  const review = await api.functional.ecommercePlatform.customer.reviews.submit(
    customerConnection,
    {
      body: {
        productId: product.id,
        orderId: order.id,
        minRating: rating,
        maxRating: rating,
        search: textContent,
      } satisfies IEcommercePlatformReview.IRequest,
    },
  );
  typia.assert(review);
  // 7. Retrieve the review by its unique identifier
  const retrievedReview =
    await api.functional.ecommercePlatform.customer.reviews.at(
      customerConnection,
      { reviewId: review.id },
    );
  typia.assert(retrievedReview);
  // 8. Validate retrieved review fields
  TestValidator.equals("review ID matches", retrievedReview.id, review.id);
  TestValidator.predicate(
    "rating is between 1 and 5",
    retrievedReview.rating >= 1 && retrievedReview.rating <= 5,
  );
  TestValidator.equals(
    "textContent matches",
    retrievedReview.textContent,
    textContent,
  );
  TestValidator.predicate(
    "deletedAt is null for active review",
    retrievedReview.deletedAt === null,
  );
  TestValidator.equals(
    "product ID matches",
    retrievedReview.product.id,
    product.id,
  );
  TestValidator.equals("order ID matches", retrievedReview.order.id, order.id);
  TestValidator.predicate(
    "customer summary has id",
    retrievedReview.customer.id.length > 0,
  );
  TestValidator.predicate(
    "has createdAt timestamp",
    retrievedReview.createdAt !== undefined &&
      retrievedReview.createdAt !== null,
  );
  TestValidator.predicate(
    "has updatedAt timestamp",
    retrievedReview.updatedAt !== undefined &&
      retrievedReview.updatedAt !== null,
  );
}
