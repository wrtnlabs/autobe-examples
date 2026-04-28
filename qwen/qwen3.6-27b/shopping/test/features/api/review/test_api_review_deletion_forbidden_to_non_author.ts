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
 * Test authorization verification where one customer attempts to delete another customer's review.
 *
 * Validates that the review deletion endpoint enforces proper authorization by rejecting deletion attempts from non-authors. Customer A is authenticated and calls DELETE on Customer B's review ID, but the system returns 403 Forbidden because the authenticated customer does not match the review author's ID.
 *
 * Customer B's review remains active on the product after the failed deletion attempt. The product's average rating is unchanged. Customer B's review is still visible in product review listings.
 *
 * 1. Administrator registers and creates a product category.
 * 2. Seller registers and creates a product with variant in the category.
 * 3. Customer B registers, creates shipping address, places order, and writes a review.
 * 4. Customer A registers separately.
 * 5. Customer A attempts to delete Customer B's review.
 * 6. System returns 403 Forbidden error because Customer A is not the review author.
 * 7. Validation confirms the 403 error is correctly raised for unauthorized deletion attempts.
 */
export async function test_api_review_deletion_forbidden_to_non_author(
  connection: api.IConnection,
): Promise<void> {
  /* ---- 1. Admin Registers and Creates Category ---- */
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  const category =
    await generate_random_ecommerce_platform_admin_categories_create(
      adminConnection,
      {},
    );
  typia.assert(category);
  /* ---- 2. Seller Registers and Creates Product with Variant ---- */
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {});
  const product =
    await generate_random_ecommerce_platform_seller_products_create(
      sellerConnection,
      { body: { category_id: category.id } },
    );
  typia.assert(product);
  const variant =
    await generate_random_ecommerce_platform_seller_products_variants_create(
      sellerConnection,
      { params: { productId: product.id } },
    );
  typia.assert(variant);
  /* ---- 3. Customer B Registers, Creates Address, Places Order, Writes Review ---- */
  const customerBConnection: api.IConnection = { host: connection.host };
  const customerBCredentials: IEcommercePlatformCustomer.ILogin = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "password123",
  };
  await authorize_customer_join(customerBConnection, {
    body: {
      email: customerBCredentials.email,
      password: customerBCredentials.password,
    },
  });
  const addressB =
    await generate_random_ecommerce_platform_customer_addresses_create(
      customerBConnection,
      {},
    );
  typia.assert(addressB);
  const order = await generate_random_ecommerce_platform_customer_orders_create(
    customerBConnection,
    {
      body: {
        shipping_address_id: addressB.id,
        items: [
          {
            ecommerce_platform_product_variant_id: variant.id,
            quantity: typia.random<
              number & tags.Type<"int32"> & tags.Minimum<1>
            >(),
            price: variant.price ?? product.base_price,
          } satisfies IEcommercePlatformOrderItem.ICreate,
        ],
      },
    },
  );
  typia.assert(order);
  const reviewBody = typia.assert<IEcommercePlatformReview.IRequest>({
    product_id: product.id,
    order_id: order.id,
    score: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<5>
    >(),
  });
  const review = await api.functional.ecommercePlatform.customer.reviews.submit(
    customerBConnection,
    { body: reviewBody },
  );
  typia.assert(review);
  TestValidator.equals("review product matches", review.product.id, product.id);
  TestValidator.equals("review order matches", review.order.id, order.id);
  /* ---- 4. Customer A Registers (Non-author) ---- */
  const customerAConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerAConnection, {});
  /* ---- 5. Customer A Attempts to Delete Customer B's Review ---- */
  /* ---- 6. System Returns 403 Forbidden ---- */
  /* ---- 7. Validate the Error ---- */
  await TestValidator.error(
    "Customer A cannot delete Customer B's review - 403 Forbidden",
    async () => {
      await api.functional.ecommercePlatform.customer.reviews.erase(
        customerAConnection,
        {
          reviewId: review.id,
        },
      );
    },
  );
}