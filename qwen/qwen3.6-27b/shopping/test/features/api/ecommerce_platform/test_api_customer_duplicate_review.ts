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
 * Validates the duplicate review rejection workflow for customer product reviews.
 *
 * Ensures that customers cannot submit more than one review for the same product and order combination.
 * The test sets up a complete order lifecycle by authenticating as an administrator to create a product category,
 * authenticating as a seller to create a product and variant, authenticating as a customer to create a shipping address and place an order.
 * After verifying the initial review submission succeeds, the test attempts to submit a second review for the exact same product and order.
 * The system must reject the duplicate submission with a business logic error (e.g., 409 Conflict),
 * enforcing the rule that only one review is permitted per product per order.
 *
 * 1. Administrator authenticates and creates a product category.
 * 2. Seller authenticates and creates a product and variant within the category.
 * 3. Customer authenticates, creates a shipping address, and places an order for the product variant.
 * 4. Customer submits a valid product review with a rating.
 * 5. Customer attempts to submit a duplicate review for the same product and order.
 * 6. System rejects the duplicate submission with a conflict error.
 */
export async function test_api_customer_duplicate_review(
  connection: api.IConnection,
) {
  // 1. Administrator authenticates and creates a product category.
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_login(adminConnection, {
    body: {
      email: "admin@test.com",
      password: "1234",
      href: "http://admin.test.com",
      referrer: "http://admin.test.com",
    } satisfies IEcommercePlatformAdmin.ILogin,
  });
  const category =
    await generate_random_ecommerce_platform_admin_categories_create(
      adminConnection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 2 }),
          description: RandomGenerator.paragraph({ sentences: 3 }),
        },
      },
    );
  typia.assert(category);
  // 2. Seller authenticates and creates a product and variant.
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {
    body: {
      email: "seller@test.com",
      password: "1234",
      href: "http://seller.test.com",
      referrer: "http://seller.test.com",
    },
  });
  const product =
    await generate_random_ecommerce_platform_seller_products_create(
      sellerConnection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 2 }),
          description: RandomGenerator.paragraph({ sentences: 3 }),
          base_price: 100.0,
          category_id: category.id,
        } satisfies IEcommercePlatformProduct.ICreate,
      },
    );
  typia.assert(product);
  const variant =
    await generate_random_ecommerce_platform_seller_products_variants_create(
      sellerConnection,
      {
        body: {
          skuCode: "TST-VARIANT-001",
          price: 100.0,
          options: [
            {
              attributeKey: "color",
              attributeValue: "Blue",
            },
          ],
        },
        params: {
          productId: product.id,
        },
      },
    );
  typia.assert(variant);
  // 3. Customer authenticates, creates address, and places order.
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {
    body: {
      email: "customer@test.com",
      password: "1234",
      href: "http://customer.test.com",
      referrer: "http://customer.test.com",
    },
  });
  const address =
    await generate_random_ecommerce_platform_customer_addresses_create(
      customerConnection,
      {
        body: {
          recipientName: RandomGenerator.name(),
          streetAddress: RandomGenerator.paragraph({ sentences: 2 }),
          city: RandomGenerator.paragraph({ sentences: 1 }),
          state: RandomGenerator.paragraph({ sentences: 1 }),
          postalCode: RandomGenerator.alphaNumeric(5),
          country: "Testland",
          isDefault: true,
        },
      },
    );
  typia.assert(address);
  const order = await generate_random_ecommerce_platform_customer_orders_create(
    customerConnection,
    {
      body: {
        items: [
          {
            ecommerce_platform_product_variant_id: variant.id,
            quantity: 1,
            price: 100.0,
          } satisfies IEcommercePlatformOrderItem.ICreate,
        ],
        shipping_address_id: address.id,
      },
    },
  );
  typia.assert(order);
  // 4. Submit a valid product review.
  const review = await api.functional.ecommercePlatform.customer.reviews.submit(
    customerConnection,
    {
      body: {
        productId: product.id,
        orderId: order.id,
        minRating: 5,
      } satisfies IEcommercePlatformReview.IRequest,
    },
  );
  typia.assert(review);
  // 5 & 6. Attempt duplicate review and verify rejection.
  await TestValidator.error("duplicate review rejected", async () => {
    await api.functional.ecommercePlatform.customer.reviews.submit(
      customerConnection,
      {
        body: {
          productId: product.id,
          orderId: order.id,
          minRating: 5,
        } satisfies IEcommercePlatformReview.IRequest,
      },
    );
  });
}
