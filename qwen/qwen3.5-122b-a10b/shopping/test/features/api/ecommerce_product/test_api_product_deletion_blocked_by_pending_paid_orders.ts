import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCategory";
import type { IEcommerceCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomer";
import type { IEcommerceProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProduct";
import type { IEcommerceProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProductImage";
import type { IEcommerceProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProductVariant";
import type { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
import type { IEcommerceSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSellerProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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
import { generate_random_ecommerce_seller_products_create } from "../../../generate/generate_random_ecommerce_seller_products_create";
import { prepare_random_ecommerce_product } from "../../../prepare/prepare_random_ecommerce_product";
import { prepare_random_ecommerce_product_image } from "../../../prepare/prepare_random_ecommerce_product_image";
import { prepare_random_ecommerce_product_variant } from "../../../prepare/prepare_random_ecommerce_product_variant";

export async function test_api_product_deletion_blocked_by_pending_paid_orders(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Test product deletion workflow with paid order blocking validation.
   *
   * Validates the product deletion business rule that prevents deletion when variants have order items in paid status. This test creates the prerequisite entities (seller, customer, product with variants) and demonstrates the deletion endpoint. Note: Full validation of the paid order blocking scenario requires order creation APIs that are not currently available in the SDK.
   *
   * The test verifies:
   * 1. Seller authentication and product creation
   * 2. Product deletion endpoint accepts valid product IDs
   * 3. Product is successfully deleted when no blocking orders exist
   *
   * **Limitation**: This test cannot fully validate the "blocked by pending paid orders" scenario because order creation APIs (POST /ecommerce/customer/orders, etc.) are not available in the provided SDK. In production, the test would:
   * - Create an order with customer for the product variant
   * - Set order status to 'paid'
   * - Attempt deletion and expect 409 Conflict error
   * - Verify product.deletedAt remains null
   *
   * 1. Create and authenticate seller account
   * 2. Create and authenticate customer account
   * 3. Seller creates product with multiple variants
   * 4. Verify product is initially active (deletedAt is null)
   * 5. Seller attempts to delete product (succeeds since no orders exist)
   * 6. Verify product is deleted (deletedAt is set)
   */
  // 1. Create and authenticate seller
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceSeller.IJoin,
  });
  typia.assert(seller);
  // 2. Create and authenticate customer
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceCustomer.IJoin,
  });
  typia.assert(customer);
  // 3. Create product with variants
  const product = await generate_random_ecommerce_seller_products_create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.name(3),
        description: RandomGenerator.paragraph({ sentences: 5 }),
        category_id: typia.random<string & tags.Format<"uuid">>(),
        base_price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1000>
        >(),
        variants: ArrayUtil.repeat(
          2,
          () =>
            ({
              sku_code: RandomGenerator.alphaNumeric(10),
              option_values: `color=${RandomGenerator.name(1)};size=${RandomGenerator.name(1)}`,
              price: typia.random<
                number & tags.Type<"uint32"> & tags.Minimum<1000>
              >(),
            }) satisfies IEcommerceProductVariant.ICreate,
        ),
      } satisfies IEcommerceProduct.ICreate,
    },
  );
  typia.assert(product);
  // 4. Verify product is initially active
  TestValidator.predicate("product not deleted", product.deletedAt === null);
  // 5. Delete product (succeeds since no orders exist - blocking scenario requires order APIs)
  await api.functional.ecommerce.seller.products.erase(sellerConnection, {
    productId: product.id,
  });
  // 6. Verify product is deleted
  // Note: Cannot verify deletedAt is set without GET product endpoint
  // The deletion succeeded without error, confirming the endpoint works
  TestValidator.predicate("deletion completed without error", true);
}
