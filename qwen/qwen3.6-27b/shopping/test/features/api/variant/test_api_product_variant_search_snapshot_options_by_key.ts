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
 * Test searching snapshot variant options by partial attribute key match.
 *
 * Validates the ILIKE/trigram partial key matching behavior of the snapshot variant option search endpoint. After creating a product variant with multiple distinct option attributes (color, size, material), the test searches the resulting snapshot with a prefix filter to confirm only the matching option attribute is returned while others are excluded.
 *
 * The search uses case-insensitive partial matching via Postgres trigram indexing. A filter key of 'col' should match 'color' but not 'size' or 'material', demonstrating that the server correctly applies ILIKE pattern matching on the attribute key column.
 *
 * 1. Admin registers, logs in, and creates a product category.
 * 2. Seller registers (auto-approved), logs in with seller connection.
 * 3. Seller creates a product under the admin's category.
 * 4. Seller creates a product variant with three options: color/Red, size/Large, material/Cotton.
 * 5. Variant creation generates a snapshot; a test UUID tracks the expected snapshot record.
 * 6. Seller searches snapshot variant options with key filter 'col'.
 * 7. Validates that only the color option is returned, confirming partial match exclusion.
 */
export async function test_api_product_variant_search_snapshot_options_by_key(
  connection: api.IConnection,
): Promise<void> {
  // --- Setup: shared seller credentials ---
  const sellerEmail = "seller@variant-snapshot-search.test";
  const sellerPassword = "SellerPass123!";
  // --- Setup: admin connection and login ---
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  await authorize_admin_login(adminConnection, {
    body: {
      email: "admin@variant-snapshot-search.test",
      password: "AdminPass123!",
      href: "https://ecommerce.test/admin/login",
      referrer: "https://ecommerce.test",
    } satisfies IEcommercePlatformAdmin.ILogin,
  });
  // --- Setup: seller connection, join, and login ---
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
    },
  });
  await authorize_seller_login(sellerConnection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      href: "https://ecommerce.test/seller/login",
      referrer: "https://ecommerce.test",
    } satisfies IEcommercePlatformSeller.ILogin,
  });
  // --- Step 1: Admin creates category ---
  const category =
    await generate_random_ecommerce_platform_admin_categories_create(
      adminConnection,
      {
        body: {
          name: "Variant Snapshot Search Category",
          description: "Category for variant snapshot key search testing",
        },
      },
    );
  typia.assert(category);
  // --- Step 2: Seller creates product ---
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
  // --- Step 3: Create variant with three options (color, size, material) ---
  const snapshotId = typia.random<string & tags.Format<"uuid">>();
  const variantBody = {
    skuCode: "TEST-VARIANT-SNP-001",
    options: [
      { attributeKey: "color", attributeValue: "Red" },
      { attributeKey: "size", attributeValue: "Large" },
      { attributeKey: "material", attributeValue: "Cotton" },
    ],
  } satisfies IEcommercePlatformProductVariant.ICreate;
  const variant =
    await generate_random_ecommerce_platform_seller_products_variants_create(
      sellerConnection,
      {
        body: variantBody,
        params: { productId: product.id },
      },
    );
  typia.assert(variant);
  // Also validate snapshot ID type
  typia.assert(snapshotId);
  // --- Step 4: Search snapshot options with partial key 'col' ---
  const searchFilter: string = "col";
  const requestBody = {
    key: searchFilter,
  } satisfies IEcommercePlatformSnapshotVariantOption.IRequest;
  const result =
    await api.functional.ecommercePlatform.seller.products.variants.snapshots.options.index(
      sellerConnection,
      {
        productId: product.id,
        variantId: variant.id,
        snapshotId: snapshotId,
        body: requestBody,
      },
    );
  typia.assert(result);
  // --- Step 5: Validate - only the 'color' option should match filter 'col' ---
  const matchedKeys = result.data.map((opt) => opt.key);
  TestValidator.equals(
    "only one option matches partial key 'col'",
    result.data.length,
    1,
  );
  TestValidator.equals(
    "matched option key is 'color'",
    result.data[0].key,
    "color",
  );
  TestValidator.equals(
    "matched option value is 'Red'",
    result.data[0].value,
    "Red",
  );
  TestValidator.predicate(
    "size option excluded from partial key search",
    matchedKeys.every((k) => k !== "size"),
  );
  TestValidator.predicate(
    "material option excluded from partial key search",
    matchedKeys.every((k) => k !== "material"),
  );
  // Validate pagination structure
  TestValidator.predicate(
    "pagination current page is 1-indexed",
    result.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination records matches data length",
    result.pagination.records === result.data.length,
  );
}
