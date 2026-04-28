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
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommercePlatformSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommercePlatformSnapshot";
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
import { prepare_random_ecommerce_platform_category } from "../../../prepare/prepare_random_ecommerce_platform_category";
import { prepare_random_ecommerce_platform_product } from "../../../prepare/prepare_random_ecommerce_platform_product";

/**
 * Test that platform administrators can access product edit snapshots regardless of ownership.
 *
 * Validates the access control model where both product's owning seller and platform
 * administrators can review historical snapshots for audit trail and dispute resolution
 * workflows. An admin joins and creates a category, a seller joins and creates a product
 * in that category, then the admin retrieves the product's snapshot history confirming
 * they can access the records with correct summary structure (id, entityType, createdAt).
 *
 * 1. Administrator joins the platform.
 * 2. Administrator creates a category for product classification.
 * 3. Seller joins and creates a product in that category.
 * 4. Administrator retrieves the product's snapshot records via the snapshots endpoint.
 * 5. Validates snapshot response structure including id, entityType, and createdAt.
 */
export async function test_api_product_snapshot_access_by_administrator(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin joins the platform
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2. Admin creates a category
  const category: IEcommercePlatformCategory =
    await generate_random_ecommerce_platform_admin_categories_create(
      adminConnection,
      {},
    );
  typia.assert(category);
  // 3. Seller joins and creates a product
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {});
  const product: IEcommercePlatformProduct =
    await generate_random_ecommerce_platform_seller_products_create(
      sellerConnection,
      {
        body: {
          category_id: category.id,
        },
      },
    );
  typia.assert(product);
  // 4. Admin retrieves snapshots for the product that the seller owns
  const snapshots: IPageIEcommercePlatformSnapshot.ISummary =
    await api.functional.ecommercePlatform.seller.products.snapshots.index(
      adminConnection,
      {
        productId: product.id,
        body: {} satisfies IEcommercePlatformSnapshot.IRequest,
      },
    );
  typia.assert(snapshots);
  // 5. Validate snapshot response structure
  TestValidator.equals(
    "snapshots include data array",
    snapshots.data.length > 0,
    true,
  );
  await TestValidator.predicate("pagination exists", () => !!snapshots.pagination);
  for (const snapshot of snapshots.data) {
    // typia.assert already validates snapshot structure
    TestValidator.equals(
      "entity type is product",
      snapshot.entityType,
      "product",
    );
  }
}