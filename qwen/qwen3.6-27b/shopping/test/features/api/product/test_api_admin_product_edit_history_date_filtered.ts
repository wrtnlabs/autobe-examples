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
import { generate_random_ecommerce_platform_seller_products_create } from "../../../generate/generate_random_ecommerce_platform_seller_products_create";
import { prepare_random_ecommerce_platform_product } from "../../../prepare/prepare_random_ecommerce_platform_product";

/**
 * Test admin filtering of product edit snapshots by date range.
 *
 * Validates that the admin snapshot query endpoint correctly filters product edit history using createdAtFrom and createdAtTo parameters in the request body. A seller creates a product and performs multiple updates, generating snapshot records at different points in time. An administrator then queries the snapshots with various date range filters and verifies that only records falling within the specified window are returned.
 *
 * Special attention is given to verifying that snapshot createdAt timestamps are correctly bounded by the provided date range filters, and that narrowing the filter range produces a reduced or equal result set.
 *
 * 1. Seller joins the platform and creates a product.
 * 2. Seller updates the product twice to generate multiple edit snapshots.
 * 3. Admin authenticates and queries snapshots with a wide date range encompassing all edits.
 * 4. Validates that all wide range results have createdAt timestamps within the wide bounds.
 * 5. Admin queries with a narrower date range and verifies filtered subset results.
 * 6. Asserts narrow result count is less than or equal to wide result count.
 */
export async function test_api_admin_product_edit_history_date_filtered(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller joins the platform
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  await authorize_seller_join(sellerConnection, {
    body: { email: sellerEmail },
  });
  // 2. Seller creates a product (generates initial snapshot record)
  const product =
    await generate_random_ecommerce_platform_seller_products_create(
      sellerConnection,
      {},
    );
  typia.assert(product);
  // 3. Seller updates product - first update triggers a snapshot
  const firstUpdate = {
    name: RandomGenerator.paragraph({ sentences: 2 }),
  } satisfies IEcommercePlatformProduct.IUpdate;
  const updatedProductV1 =
    await api.functional.ecommercePlatform.seller.products.update(
      sellerConnection,
      {
        productId: product.id,
        body: firstUpdate,
      },
    );
  typia.assert(updatedProductV1);
  // 4. Seller updates product again - second update triggers another snapshot
  const secondUpdate = {
    description: RandomGenerator.content({ paragraphs: 1 }),
  } satisfies IEcommercePlatformProduct.IUpdate;
  const updatedProductV2 =
    await api.functional.ecommercePlatform.seller.products.update(
      sellerConnection,
      {
        productId: product.id,
        body: secondUpdate,
      },
    );
  typia.assert(updatedProductV2);
  // 5. Admin authenticates
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 6. Query snapshots with wide date range (should include all snapshots)
  const wideRequest = {
    createdAtFrom: product.created_at,
    createdAtTo: updatedProductV2.updated_at,
    entityType: "product",
  } satisfies IEcommercePlatformSnapshot.IRequest;
  const wideResults =
    await api.functional.ecommercePlatform.admin.products.snapshots.index(
      adminConnection,
      {
        productId: product.id,
        body: wideRequest,
      },
    );
  typia.assert(wideResults);
  // 7. Validate wide range returns at least some snapshots
  TestValidator.predicate(
    "wide date range returns snapshots",
    wideResults.data.length >= 1,
  );
  // 8. Validate all wide results are within the specified date bounds
  for (const snapshot of wideResults.data) {
    TestValidator.predicate(
      `snapshot ${snapshot.id} createdAt >= wide createdAtFrom`,
      snapshot.createdAt >= wideRequest.createdAtFrom!,
    );
    TestValidator.predicate(
      `snapshot ${snapshot.id} createdAt <= wide createdAtTo`,
      snapshot.createdAt <= wideRequest.createdAtTo!,
    );
  }
  // 9. Query snapshots with narrow date range (between the two updates)
  const narrowRequest = {
    createdAtFrom: updatedProductV1.updated_at,
    createdAtTo: updatedProductV2.updated_at,
    entityType: "product",
  } satisfies IEcommercePlatformSnapshot.IRequest;
  const narrowResults =
    await api.functional.ecommercePlatform.admin.products.snapshots.index(
      adminConnection,
      {
        productId: product.id,
        body: narrowRequest,
      },
    );
  typia.assert(narrowResults);
  // 10. Validate all narrow results are within narrow bounds
  for (const snapshot of narrowResults.data) {
    TestValidator.predicate(
      `snapshot ${snapshot.id} createdAt >= narrow createdAtFrom`,
      snapshot.createdAt >= narrowRequest.createdAtFrom!,
    );
    TestValidator.predicate(
      `snapshot ${snapshot.id} createdAt <= narrow createdAtTo`,
      snapshot.createdAt <= narrowRequest.createdAtTo!,
    );
  }
  // 11. Narrow range should return fewer or equal results than wide range
  TestValidator.predicate(
    "narrow date range returns fewer or equal snapshots than wide range",
    narrowResults.data.length <= wideResults.data.length,
  );
}
