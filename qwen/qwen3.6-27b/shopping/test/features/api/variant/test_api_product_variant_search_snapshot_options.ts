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
import type { IEcommercePlatformSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformSnapshot";
import type { IEcommercePlatformSnapshotVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformSnapshotVariant";
import type { IEcommercePlatformSnapshotVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformSnapshotVariantOption";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommercePlatformSnapshotVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommercePlatformSnapshotVariantOption";
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
 * Test product variant snapshot option search functionality.
 *
 * Validates the complete flow from administrator category creation through seller
 * product and variant management. Creates a variant with three specific option
 * configurations (color/Red, size/Large, material/Cotton) and verifies the options
 * are correctly persisted in the variant response. Also confirms the snapshot variant
 * options endpoint properly rejects requests for non-existent snapshot IDs.
 *
 * Business rules validated include option key uniqueness per variant, correct
 * option key-value pair storage, and variant-product lineage. The snapshot options
 * endpoint error handling is tested to ensure proper HTTP 404 responses for invalid
 * snapshot references.
 *
 * 1. Administrator registers and creates a root product category.
 * 2. Seller registers for shop operation access.
 * 3. Seller creates a product assigned to the admin category.
 * 4. Seller creates a variant with three specific option key-value pairs.
 * 5. Validates the variant response contains all expected options.
 * 6. Tests snapshot options endpoint returns 404 for non-existent snapshots.
 */
export async function test_api_product_variant_search_snapshot_options(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin registers and creates a category
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {});
  typia.assert(adminAuth);
  const category =
    await generate_random_ecommerce_platform_admin_categories_create(
      adminConnection,
      {},
    );
  typia.assert(category);
  // 2. Seller registers
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {});
  typia.assert(sellerAuth);
  // 3. Create product under the category
  const product =
    await generate_random_ecommerce_platform_seller_products_create(
      sellerConnection,
      { body: { category_id: category.id } },
    );
  typia.assert(product);
  // 4. Create variant with specific options: color/Red, size/Large, material/Cotton
  const variant =
    await generate_random_ecommerce_platform_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          options: [
            { attributeKey: "color", attributeValue: "Red" },
            { attributeKey: "size", attributeValue: "Large" },
            { attributeKey: "material", attributeValue: "Cotton" },
          ],
        },
      },
    );
  typia.assert(variant);
  // 5. Validate variant has exactly 3 options
  TestValidator.equals("variant options count", variant.options.length, 3);
  // 6. Find and validate each option by attribute key
  const colorOpt = variant.options.find((o) => o.attributeKey === "color");
  const sizeOpt = variant.options.find((o) => o.attributeKey === "size");
  const materialOpt = variant.options.find(
    (o) => o.attributeKey === "material",
  );
  TestValidator.predicate("color option exists", colorOpt !== undefined);
  TestValidator.predicate("size option exists", sizeOpt !== undefined);
  TestValidator.predicate("material option exists", materialOpt !== undefined);
  // 7. Validate option values match the expected key-value pairs
  TestValidator.equals("color option value", colorOpt!.attributeValue, "Red");
  TestValidator.equals("size option value", sizeOpt!.attributeValue, "Large");
  TestValidator.equals(
    "material option value",
    materialOpt!.attributeValue,
    "Cotton",
  );
  // 8. Validate variant-product linkage
  TestValidator.equals(
    "variant product ID matches",
    variant.product.id,
    product.id,
  );
  // 9. Test snapshot options endpoint — 404 for non-existent snapshot ID
  // Snapshot is auto-created during variant creation but its ID is not accessible
  // through the available SDK. This verifies the endpoint handles invalid requests
  // with proper HTTP 404 responses.
  const nonExistentSnapshotId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.httpError(
    "404 for non-existent snapshot",
    404,
    async () => {
      await api.functional.ecommercePlatform.seller.products.variants.snapshots.options.index(
        sellerConnection,
        {
          productId: product.id,
          variantId: variant.id,
          snapshotId: nonExistentSnapshotId,
          body: {} satisfies IEcommercePlatformSnapshotVariantOption.IRequest,
        },
      );
    },
  );
}
