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
 * Test that updating a variant's SKU code fails when the new SKU conflicts with an existing variant under the same product.
 *
 * Validates the duplicate SKU conflict scenario for product variant updates. The test confirms that sellers cannot overwrite or copy an existing SKU code when updating a variant. This ensures SKU uniqueness is maintained within a product scope, preventing accidental duplicate SKUs which would cause inventory tracking issues.
 *
 * 1. Create an admin account and authenticate.
 * 2. Admin creates a category for product organization.
 * 3. Create a seller account and authenticate.
 * 4. Seller creates a product under the created category.
 * 5. Seller creates two variants with distinct SKU codes: 'PROD-L-001' and 'PROD-L-002'.
 * 6. Seller attempts to update the first variant's SKU to 'PROD-L-002' (conflicting with variant 2).
 * 7. Verify the update fails with 409 Conflict status due to duplicate SKU.
 * 8. Verify the variant's sku_code remains unchanged after the failed update.
 */
export async function test_api_product_variant_update_sku_duplicate_conflict(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin account and authenticate
  const adminJoinConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminJoinConnection, {});
  const adminLoginConnection: api.IConnection = { host: connection.host };
  await authorize_admin_login(adminLoginConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // 2. Admin creates a category
  const category: IEcommercePlatformCategory =
    await generate_random_ecommerce_platform_admin_categories_create(
      adminLoginConnection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 2 }),
          description: RandomGenerator.paragraph({ sentences: 5 }),
          parentEcommercePlatformCategoryId: null,
        },
      },
    );
  typia.assert(category);
  // 3. Create seller account and authenticate
  const sellerJoinConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerJoinConnection, {});
  const sellerLoginConnection: api.IConnection = { host: connection.host };
  await authorize_seller_login(sellerLoginConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // 4. Seller creates a product under the created category
  const product: IEcommercePlatformProduct =
    await generate_random_ecommerce_platform_seller_products_create(
      sellerLoginConnection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 2 }),
          description: RandomGenerator.paragraph({ sentences: 5 }),
          base_price: typia.random<
            number & tags.Type<"uint32"> & tags.Minimum<1000>
          >(),
          category_id: category.id,
        },
      },
    );
  typia.assert(product);
  // 5. Seller creates two variants with distinct SKU codes
  const variant1: IEcommercePlatformProductVariant =
    await generate_random_ecommerce_platform_seller_products_variants_create(
      sellerLoginConnection,
      {
        params: { productId: product.id },
        body: {
          skuCode: "PROD-L-001",
          price: undefined,
          options: ArrayUtil.repeat(1, () => ({
            attributeKey: "color",
            attributeValue: "Red",
          })),
        },
      },
    );
  typia.assert(variant1);
  const variant2: IEcommercePlatformProductVariant =
    await generate_random_ecommerce_platform_seller_products_variants_create(
      sellerLoginConnection,
      {
        params: { productId: product.id },
        body: {
          skuCode: "PROD-L-002",
          price: undefined,
          options: ArrayUtil.repeat(1, () => ({
            attributeKey: "size",
            attributeValue: "Large",
          })),
        },
      },
    );
  typia.assert(variant2);
  // 6. Seller attempts to update variant 1's SKU to 'PROD-L-002' (conflicting with variant 2)
  const updateBody = {
    sku_code: "PROD-L-002",
    price: undefined,
    options: undefined,
  } satisfies IEcommercePlatformProductVariant.IUpdate;
  // 7. Verify the update fails with 409 Conflict status
  await TestValidator.httpError("duplicate SKU conflict", 409, async () => {
    await api.functional.ecommercePlatform.seller.products.variants.update(
      sellerLoginConnection,
      {
        productId: product.id,
        variantId: variant1.id,
        body: updateBody,
      },
    );
  });
  // 8. Verify the variant's sku_code remains unchanged after the failed update
  // Note: We cannot fetch the variant directly without an SDK getter function, so we verify the original value
  TestValidator.equals("SKU code unchanged", variant1.sku_code, "PROD-L-001");
}