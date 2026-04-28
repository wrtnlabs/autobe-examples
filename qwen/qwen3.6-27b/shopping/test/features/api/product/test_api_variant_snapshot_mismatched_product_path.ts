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
 * Test variant snapshot retrieval with a mismatched productId in the path.
 *
 * Validates that the admin variant snapshot endpoint enforces path consistency by rejecting requests where the productId does not match the actual parent product of the referenced variant. This composite path integrity check prevents erroneous or malicious snapshot access attempts.
 *
 * Two products are created with a variant belonging to the first product only. When the admin requests the snapshot using the second product's ID alongside the variant's ID, the system must detect the mismatch and return a 404 error.
 *
 * 1. Register and authenticate admin with known credentials.
 * 2. Admin creates two product categories.
 * 3. Register and authenticate seller.
 * 4. Seller creates first product in first category, second product in second category.
 * 5. Seller creates a variant on the first product.
 * 6. Seller updates the variant, triggering automatic snapshot generation.
 * 7. Admin requests the snapshot using the second product's ID (mismatched).
 * 8. System returns 404 because productId does not match the variant's parent product.
 */
export async function test_api_variant_snapshot_mismatched_product_path(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin authentication with known credentials
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: "admin+variant_snapshot_mismatch@test.com",
      password: "Admin1234!",
    },
  });
  await authorize_admin_login(adminConnection, {
    body: {
      email: "admin+variant_snapshot_mismatch@test.com",
      password: "Admin1234!",
      href: "https://test.ecommerce.com/admin",
      referrer: "https://test.ecommerce.com/admin",
    } satisfies IEcommercePlatformAdmin.ILogin,
  });
  // 2. Create two categories
  const category1 =
    await generate_random_ecommerce_platform_admin_categories_create(
      adminConnection,
      {},
    );
  typia.assert(category1);
  const category2 =
    await generate_random_ecommerce_platform_admin_categories_create(
      adminConnection,
      {},
    );
  typia.assert(category2);
  // 3. Seller authentication
  const sellerConnection: api.IConnection = { host: connection.host };
  const joinedSeller = await authorize_seller_join(sellerConnection, {
    body: {
      email: "seller+variant_snapshot_mismatch@test.com",
      password: "Seller1234!",
    },
  });
  typia.assert(joinedSeller);
  await authorize_seller_login(sellerConnection, {
    body: {
      email: joinedSeller.email,
      password: "Seller1234!",
      href: "https://test.ecommerce.com/seller",
      referrer: "https://test.ecommerce.com/seller",
    } satisfies IEcommercePlatformSeller.ILogin,
  });
  // 4. Seller creates first product
  const product1 =
    await generate_random_ecommerce_platform_seller_products_create(
      sellerConnection,
      { body: { category_id: category1.id } },
    );
  typia.assert(product1);
  // 5. Seller creates second product (will be used as mismatched productId)
  const product2 =
    await generate_random_ecommerce_platform_seller_products_create(
      sellerConnection,
      { body: { category_id: category2.id } },
    );
  typia.assert(product2);
  // 6. Create variant on first product
  const variant =
    await generate_random_ecommerce_platform_seller_products_variants_create(
      sellerConnection,
      { params: { productId: product1.id } },
    );
  typia.assert(variant);
  // 7. Update variant to generate snapshot
  const updatedVariant =
    await api.functional.ecommercePlatform.seller.products.variants.update(
      sellerConnection,
      {
        productId: product1.id,
        variantId: variant.id,
        body: {
          sku_code: "UPDATED-SKU-" + RandomGenerator.alphaNumeric(6),
        } satisfies IEcommercePlatformProductVariant.IUpdate,
      },
    );
  typia.assert(updatedVariant);
  // 8. Generate a random snapshotId (representing the snapshot created by the update)
  const snapshotId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 9. Admin attempts to retrieve snapshot with MISMATCHED productId
  // Uses product2.id instead of product1.id (the actual parent of the variant)
  await TestValidator.httpError(
    "variant snapshot with mismatched productId returns 404",
    404,
    async () =>
      await api.functional.ecommercePlatform.admin.products.variants.snapshots.at(
        adminConnection,
        {
          productId: product2.id,
          variantId: variant.id,
          snapshotId: snapshotId,
        },
      ),
  );
}
