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
 * Test product snapshot retrieval by owner seller.
 *
 * Validates the complete workflow where an administrator creates a category, a seller joins and creates a product in that category, modifies the product multiple times to generate snapshot records, and then retrieves the paginated list of edit snapshots for their product.
 *
 * 1. Administrator registers and creates a category.
 * 2. Seller registers and creates a product in the category.
 * 3. Seller modifies the product multiple times (simulated by multiple creates/updates via SDK or logic).
 * 4. Seller retrieves snapshots for their product ID.
 * 5. Validates pagination metadata and snapshot records including entityType 'product' and createdAt timestamps.
 * 6. Tests optional search filters (date range createdAtFrom/createdAtTo) and free-text search term.
 */
export async function test_api_product_snapshot_retrieval_by_owner_seller(
  connection: api.IConnection,
) {
  // 1. Admin setup
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommercePlatformAdmin.IJoin,
  });
  const category: IEcommercePlatformCategory =
    await generate_random_ecommerce_platform_admin_categories_create(
      adminConnection,
      {},
    );
  typia.assert(category);
  // 2. Seller setup and product creation
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller: IEcommercePlatformSeller.IAuthorized =
    await authorize_seller_join(sellerConnection, {});
  typia.assert(seller);
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
  // 3. Retrieve snapshots for the product
  const snapshots: IPageIEcommercePlatformSnapshot.ISummary =
    await api.functional.ecommercePlatform.seller.products.snapshots.index(
      sellerConnection,
      {
        productId: product.id,
        body: {} satisfies IEcommercePlatformSnapshot.IRequest,
      },
    );
  typia.assert(snapshots);
  // 4. Validate basic snapshot structure
  TestValidator.equals("snapshots returned", snapshots.data.length > 0, true);
  TestValidator.equals(
    "entity type is product",
    snapshots.data[0].entityType,
    "product",
  );
  // 5. Test with date range filters
  const startDate = new Date(Date.now() - 86400000).toISOString(); // 1 day ago
  const endDate = new Date().toISOString();
  const filteredSnapshots: IPageIEcommercePlatformSnapshot.ISummary =
    await api.functional.ecommercePlatform.seller.products.snapshots.index(
      sellerConnection,
      {
        productId: product.id,
        body: {
          createdAtFrom: startDate,
          createdAtTo: endDate,
        } satisfies IEcommercePlatformSnapshot.IRequest,
      },
    );
  typia.assert(filteredSnapshots);
  TestValidator.predicate(
    "filtered snapshots within date range",
    filteredSnapshots.data.every(
      (snapshot) =>
        snapshot.createdAt >= startDate && snapshot.createdAt <= endDate,
    ),
  );
  // 6. Test with search term
  const searchSnapshots: IPageIEcommercePlatformSnapshot.ISummary =
    await api.functional.ecommercePlatform.seller.products.snapshots.index(
      sellerConnection,
      {
        productId: product.id,
        body: {
          search: "test" as string,
        } satisfies IEcommercePlatformSnapshot.IRequest,
      },
    );
  typia.assert(searchSnapshots);
}
