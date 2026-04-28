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
import { generate_random_ecommerce_platform_seller_products_variants_options_create } from "../../../generate/generate_random_ecommerce_platform_seller_products_variants_options_create";
import { prepare_random_ecommerce_platform_category } from "../../../prepare/prepare_random_ecommerce_platform_category";
import { prepare_random_ecommerce_platform_product } from "../../../prepare/prepare_random_ecommerce_platform_product";
import { prepare_random_ecommerce_platform_product_variant } from "../../../prepare/prepare_random_ecommerce_platform_product_variant";
import { prepare_random_ecommerce_platform_product_variant_option } from "../../../prepare/prepare_random_ecommerce_platform_product_variant_option";

/**
 * Validates duplicate attribute key conflict on product variant options.
 *
 * Tests that the system enforces unique attribute keys per product variant by:
 * 1. Admin creating a category for product classification.
 * 2. Seller registering and authenticating to the platform.
 * 3. Seller creating a product associated with the category.
 * 4. Seller creating a product variant with an initial option using attribute key 'color' with value 'Red'.
 * 5. Seller attempting to add a second option with the same attribute key 'color' but different value 'Blue'.
 *
 * The system should reject the duplicate with 409 Conflict, confirming that no duplicate option is created.
 *
 * 1. Admin logs in and creates a product category.
 * 2. Seller joins and logs in for authentication.
 * 3. Seller creates a product with the category.
 * 4. Seller creates a variant with option attribute key 'color': 'Red'.
 * 5. Seller attempts duplicate option 'color': 'Blue' and validates 409 error.
 */
export async function test_api_product_variant_option_duplicate_key_conflict(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin login
  const adminConnection: api.IConnection = {
    host: connection.host,
  };
  await authorize_admin_login(adminConnection, {
    body: {
      email: "admin@test.com",
      password: "admin123!",
      href: "https://test.com",
      referrer: "https://test.com",
    } satisfies IEcommercePlatformAdmin.ILogin,
  });
  // Admin creates category
  const category =
    await api.functional.ecommercePlatform.admin.categories.create(
      adminConnection,
      {
        body: {
          name: "Electronics",
          description: "Electronic products and accessories",
        } satisfies IEcommercePlatformCategory.ICreate,
      },
    );
  typia.assert(category);
  // 2. Seller join
  const sellerJoinConnection: api.IConnection = {
    host: connection.host,
  };
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  await authorize_seller_join(sellerJoinConnection, {
    body: {
      email: sellerEmail,
      password: "seller123!",
      href: "https://test.com",
      referrer: "https://test.com",
    } satisfies IEcommercePlatformSeller.IJoin,
  });
  // Seller login
  const sellerConnection: api.IConnection = {
    host: connection.host,
  };
  await authorize_seller_login(sellerConnection, {
    body: {
      email: sellerEmail,
      password: "seller123!",
      href: "https://test.com",
      referrer: "https://test.com",
    } satisfies IEcommercePlatformSeller.ILogin,
  });
  // 3. Seller creates product
  const product = await api.functional.ecommercePlatform.seller.products.create(
    sellerConnection,
    {
      body: {
        name: "Wireless Headphones",
        description: "High-quality wireless headphones with noise cancellation",
        base_price: 199.99,
        category_id: category.id,
      } satisfies IEcommercePlatformProduct.ICreate,
    },
  );
  typia.assert(product);
  // 4. Seller creates variant with initial option
  const variant =
    await api.functional.ecommercePlatform.seller.products.variants.create(
      sellerConnection,
      {
        productId: product.id,
        body: {
          skuCode: "HP-BLK-001",
          options: ArrayUtil.repeat(
            1,
            () =>
              ({
                attributeKey: "color",
                attributeValue: "Red",
              }) as const,
          ),
        } satisfies IEcommercePlatformProductVariant.ICreate,
      },
    );
  typia.assert(variant);
  // 5. Attempt to create duplicate option with same attribute key
  await TestValidator.httpError(
    "duplicate attribute key rejected",
    [409],
    async () => {
      await api.functional.ecommercePlatform.seller.products.variants.options.create(
        sellerConnection,
        {
          productId: product.id,
          skuCode: variant.sku_code,
          body: {
            attributeKey: "color",
            attributeValue: "Blue",
          } satisfies IEcommercePlatformProductVariantOption.ICreate,
        },
      );
    },
  );
}
