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
 * Test unauthorized seller attempt to add product variant option.
 *
 * Validates that cross-seller modifications to product variant options are properly
 * rejected with appropriate authorization errors. Verifies that product ownership is
 * enforced when attempting to modify resources owned by another seller.
 *
 * 1. Admin registers and logs in to create a product category
 * 2. First seller (Seller A) registers, logs in, creates a product with category
 * 3. Seller A creates a product variant with options for the product
 * 4. Second seller (Seller B) registers with different credentials
 * 5. Seller B attempts to add an option to Seller A's product variant
 * 6. System rejects the request with 403 Forbidden due to unauthorized access
 * 7. Validates that no option was created by the unauthorized seller
 */
export async function test_api_product_variant_option_unauthorized_seller(
  connection: api.IConnection,
) {
  // 1. Admin setup - register and login admin
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: "admin@test.com",
      password: "Admin1234!",
      href: "https://test.com/admin/register",
      referrer: "https://test.com/signup",
    },
  });
  // 2. Admin creates category for product assignment
  const generated_category =
    await generate_random_ecommerce_platform_admin_categories_create(
      adminConnection,
      {
        body: {
          name: "Test Category",
          description:
            "Category for testing product variant option authorization",
        },
      },
    );
  typia.assert(generated_category);
  // 3. First seller (Seller A) setup - register and login
  const sellerAConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerAConnection, {
    body: {
      email: "sellerA@test.com",
      password: "SellerA1234!",
      href: "https://test.com/seller/register",
      referrer: "https://test.com/seller/signup",
    },
  });
  // 4. Seller A creates a product
  const generated_product =
    await generate_random_ecommerce_platform_seller_products_create(
      sellerAConnection,
      {
        body: {
          name: "Test Product by Seller A",
          description: "Product created by Seller A for authorization testing",
          base_price: 29.99,
          category_id: generated_category.id,
        },
      },
    );
  typia.assert(generated_product);
  // 5. Seller A creates a product variant with initial options
  const generated_variant =
    await generate_random_ecommerce_platform_seller_products_variants_create(
      sellerAConnection,
      {
        body: {
          skuCode: "VARIANT-001",
          price: 34.99,
          options: [
            {
              attributeKey: "color",
              attributeValue: "Red",
            },
          ],
        },
        params: {
          productId: generated_product.id,
        },
      },
    );
  typia.assert(generated_variant);
  // 6. Second seller (Seller B) setup - register and login
  const sellerBConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerBConnection, {
    body: {
      email: "sellerB@test.com",
      password: "SellerB1234!",
      href: "https://test.com/seller/register",
      referrer: "https://test.com/seller/signup",
    },
  });
  // 7. Seller B attempts to add an option to Seller A's product variant
  // This should fail with 403 Forbidden
  await TestValidator.error(
    "Seller B cannot add option to Seller A's product variant",
    async () => {
      await api.functional.ecommercePlatform.seller.products.variants.options.create(
        sellerBConnection,
        {
          productId: generated_product.id,
          skuCode: generated_variant.sku_code,
          body: {
            attributeKey: "size",
            attributeValue: "Large",
          } satisfies IEcommercePlatformProductVariantOption.ICreate,
        },
      );
    },
  );
}
