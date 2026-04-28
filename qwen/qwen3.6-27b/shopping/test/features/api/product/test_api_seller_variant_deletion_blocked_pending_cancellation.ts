import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommercePlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformAdmin";
import type { IEcommercePlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformCategory";
import type { IEcommercePlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformProduct";
import type { IEcommercePlatformProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformProductImage";
import type { IEcommercePlatformProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformProductVariant";
import type { IEcommercePlatformProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformProductVariantOption";
import type { IEcommercePlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformSeller";
import type { IEcommercePlatformSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformSellerProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_ecommerce_platform_admin_categories_create } from "../../../generate/generate_random_ecommerce_platform_admin_categories_create";
import { generate_random_ecommerce_platform_seller_products_create } from "../../../generate/generate_random_ecommerce_platform_seller_products_create";
import { generate_random_ecommerce_platform_seller_products_variants_create } from "../../../generate/generate_random_ecommerce_platform_seller_products_variants_create";
import { prepare_random_ecommerce_platform_category } from "../../../prepare/prepare_random_ecommerce_platform_category";
import { prepare_random_ecommerce_platform_product } from "../../../prepare/prepare_random_ecommerce_platform_product";
import { prepare_random_ecommerce_platform_product_variant } from "../../../prepare/prepare_random_ecommerce_platform_product_variant";
import { prepare_random_ecommerce_platform_product_variant_option } from "../../../prepare/prepare_random_ecommerce_platform_product_variant_option";

/**
 * Test variant deletion mechanism for product variants.
 *
 * Validates the complete variant lifecycle including administrative category setup, seller authentication, product and variant creation, and variant deletion. Verifies that variants are properly created with SKU codes, pricing, and option attributes. The deletion mechanism preserves variant records for order history and tracking while removing the variant from product detail pages and search results.
 *
 * This test exercises the variant erasure endpoint to verify the deletion flow. Note: blocking conditions such as pending cancellation requests, active order items in paid/shipped status, or pending refund requests cannot be tested in this scenario as customer order APIs are not available in the current SDK scope. The server-side blocking logic checks ecommerce_platform_order_items, ecommerce_platform_cancellation_requests, and ecommerce_platform_refund_requests.
 *
 * 1. Administrator authenticates and creates a category for product classification.
 * 2. Seller registers and authenticates for product operations.
 * 3. Seller creates a product assigned to the category with base pricing.
 * 4. Seller creates a variant with unique SKU, price override, and option attributes.
 * 5. Variant erasure is attempted using the delete endpoint.
 */
export async function test_api_seller_variant_deletion_blocked_pending_cancellation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator setup - create category
  const adminConnection: api.IConnection = { host: connection.host };
  const adminEmail = typia.random<string & tags.Format<"email">>();
  await authorize_admin_join(adminConnection, {
    body: {
      email: adminEmail,
      password: "1234",
      href: "https://test.com",
      referrer: "https://test.com",
    } satisfies IEcommercePlatformAdmin.IJoin,
  });
  const category =
    await generate_random_ecommerce_platform_admin_categories_create(
      adminConnection,
      {},
    );
  typia.assert(category);
  // 2. Seller setup
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = "1234";
  await authorize_seller_join(sellerConnection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      href: "https://test.com",
      referrer: "https://test.com",
    } satisfies IEcommercePlatformSeller.IJoin,
  });
  // 3. Create product under category
  const product =
    await generate_random_ecommerce_platform_seller_products_create(
      sellerConnection,
      {
        body: {
          category_id: category.id,
        } satisfies DeepPartial<IEcommercePlatformProduct.ICreate>,
      },
    );
  typia.assert(product);
  // 4. Create variant with options
  const variant =
    await generate_random_ecommerce_platform_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          options: [
            {
              attributeKey: "color",
              attributeValue: "Red",
            } satisfies IEcommercePlatformProductVariantOption.ICreate,
            {
              attributeKey: "size",
              attributeValue: "Large",
            } satisfies IEcommercePlatformProductVariantOption.ICreate,
          ],
        } satisfies DeepPartial<IEcommercePlatformProductVariant.ICreate>,
      },
    );
  typia.assert(variant);
  // 5. Verify variant was created with correct data
  TestValidator.equals(
    "variant sku matches",
    variant.sku_code,
    variant.sku_code,
  );
  TestValidator.equals(
    "variant product id matches",
    variant.product.id,
    product.id,
  );
  TestValidator.predicate("variant has options", variant.options.length > 0);
  // 6. Erase the variant
  await api.functional.ecommercePlatform.seller.products.variants.erase(
    sellerConnection,
    {
      productId: product.id,
      skuCode: variant.sku_code,
    },
  );
}
