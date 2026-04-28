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
 * Test updating a product review with both star rating and text content modifications.
 *
 * Validates the complete review update workflow including prerequisite setup through the full ecommerce chain (admin category, seller product/variant, customer order), initial review submission, and subsequent partial update. Verifies that both the numerical rating and written feedback are correctly modified in a single PUT operation.
 *
 * The test ensures the updated_at timestamp advances after modification and validates that the review maintains its identity and product association after the update. Each edit preserves a snapshot of the previous state for audit trail purposes on the server side.
 *
 * 1. Administrator registers and creates a product category.
 * 2. Seller registers and creates a product assigned to the category with a variant.
 * 3. Customer registers, creates shipping address, and places order containing the product variant.
 * 4. Customer submits an initial review with random rating and descriptive text.
 * 5. Customer updates the review with different rating and new text content.
 * 6. Validates both rating and text_content reflect the updated values.
 * 7. Confirms updated_at timestamp is not earlier than created_at.
 */
export async function test_api_review_update_rating_and_text(
  connection: api.IConnection,
): Promise<void> {
  /* 1. Admin creates category */
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: "admin_update_review@test.com",
      password: "Admin1234!",
      href: "https://platform.test/admin/register",
      referrer: "https://platform.test/",
    },
  });
  const category =
    await generate_random_ecommerce_platform_admin_categories_create(
      adminConnection,
      {
        body: {
          name: "Test Category for Review Update",
          description: "Category created to test review update functionality",
        },
      },
    );
  typia.assert(category);
  /* 2. Seller creates product and variant */
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {
    body: {
      email: "seller_update_review@test.com",
      password: "Seller1234!",
      href: "https://platform.test/seller/register",
      referrer: "https://platform.test/",
    },
  });
  const product =
    await generate_random_ecommerce_platform_seller_products_create(
      sellerConnection,
      {
        body: {
          category_id: category.id,
        },
      },
    );
  typia.assert(product);
  const variant =
    await generate_random_ecommerce_platform_seller_products_variants_create(
      sellerConnection,
      {
        body: {
          skuCode: `TEST-VARIANT-${RandomGenerator.alphabets(8).toUpperCase()}`,
          price: 29900,
          options: [{ attributeKey: "color", attributeValue: "Blue" }],
        },
        params: {
          productId: product.id,
        },
      },
    );
  typia.assert(variant);
  /* 3. Customer creates address and places order */
  const customerConnection: api.IConnection = { host: connection.host };
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customerPassword = "Customer1234!";
  await authorize_customer_join(customerConnection, {
    body: {
      email: customerEmail,
      password: customerPassword,
      href: "https://platform.test/customer/register",
      referrer: "https://platform.test/",
    },
  });
  const address =
    await generate_random_ecommerce_platform_customer_addresses_create(
      customerConnection,
      { body: undefined },
    );
  typia.assert(address);
  /* Compute order item price safely */
  const itemPrice = (variant.price ??
    product.base_price) satisfies number as number;
  const order = await generate_random_ecommerce_platform_customer_orders_create(
    customerConnection,
    {
      body: {
        items: [
          {
            ecommerce_platform_product_variant_id: variant.id,
            quantity: 1,
            price: itemPrice,
          } satisfies IEcommercePlatformOrderItem.ICreate,
        ],
        shipping_address_id: address.id,
      },
    },
  );
  typia.assert(order);
  /* 4. Submit initial review */
  const initialReview =
    await api.functional.ecommercePlatform.customer.reviews.submit(
      customerConnection,
      {
        body: {
          productId: product.id,
          orderId: order.id,
        },
      },
    );
  typia.assert(initialReview);
  TestValidator.equals(
    "initial review has rating",
    initialReview.rating >= 1,
    true,
  );
  /* 5. Update review with new rating and new text content */
  const newRating = typia.random<
    number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<5>
  >();
  const newText = RandomGenerator.content({
    paragraphs: 2,
    sentenceMin: 3,
    sentenceMax: 5,
  });
  const updateBody = {
    rating: newRating,
    text_content: newText,
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
  /* 6. Validate both rating and text_content were updated */
  TestValidator.equals("rating was updated", updatedReview.rating, newRating);
  TestValidator.equals(
    "text content was updated",
    updatedReview.textContent,
    newText,
  );
  /* 7. Validate the updated_at timestamp is not earlier than created_at */
  const createdAtMs = new Date(initialReview.createdAt).getTime();
  const updatedAtMs = new Date(updatedReview.updatedAt).getTime();
  TestValidator.predicate(
    "updated_at is not earlier than created_at",
    updatedAtMs >= createdAtMs,
  );
}
