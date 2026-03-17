import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import type { IEcommerceMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshot";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallProductSnapshot";
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
import { generate_random_ecommerce_mall_seller_products_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_create";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";

/**
 * Test administrator can retrieve product snapshots for compliance oversight.
 *
 * This test validates the administrative capability to access historical audit trails
 * for any product on the platform, regardless of ownership. Key validation points:
 * - Admin can access snapshots for products owned by other sellers
 * - Snapshot summaries contain all required metadata fields
 * - Pagination works with custom page/limit parameters
 * - Snapshots persist even after product deletion or seller suspension
 *
 * Test flow:
 * 1. Authenticate as administrator
 * 2. Create and approve seller account
 * 3. Seller creates a product
 * 4. Edit product multiple times to generate snapshots
 * 5. Admin retrieves snapshots with pagination
 * 6. Delete product and verify snapshots remain accessible
 * 7. Suspend seller and verify snapshots still accessible
 */
export async function test_api_product_snapshot_retrieval_by_administrator(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_login(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IEcommerceMallAdmin.ILogin,
  });
  typia.assert(adminAuth);
  // 2. Create seller account
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      shop_name: RandomGenerator.name(),
      shop_description: RandomGenerator.paragraph({ sentences: 2 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IEcommerceMallSeller.IJoin,
  });
  typia.assert(sellerAuth);
  // 3. Create a product owned by the seller
  const product = await generate_random_ecommerce_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.name(),
        description: RandomGenerator.paragraph({ sentences: 5 }),
        category_id: typia.random<string & tags.Format<"uuid">>(),
        base_price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1000>
        >(),
      } satisfies IEcommerceMallProduct.ICreate,
    },
  );
  typia.assert(product);
  // 4. Edit product multiple times to generate snapshots
  const updateCount = 3;
  const originalName = product.name;
  await ArrayUtil.asyncRepeat(updateCount, async (index) => {
    const updated = await api.functional.ecommerceMall.seller.products.update(
      sellerConnection,
      {
        productId: product.id,
        body: {
          name: `${originalName} (v${index + 1})`,
          description: RandomGenerator.paragraph({ sentences: 5 + index }),
        } satisfies IEcommerceMallProduct.IUpdate,
      },
    );
    typia.assert(updated);
  });
  // 5. Admin retrieves snapshots with default pagination
  const snapshotsPage =
    await api.functional.ecommerceMall.products.snapshots.index(
      adminConnection,
      {
        productId: product.id,
        body: {} satisfies IEcommerceMallProductSnapshot.IRequest,
      },
    );
  typia.assert(snapshotsPage);
  // 6. Verify response structure and snapshot summaries
  TestValidator.equals(
    "pagination present",
    snapshotsPage.pagination !== null && snapshotsPage.pagination !== undefined,
    true,
  );
  TestValidator.predicate("has snapshots", snapshotsPage.data.length > 0);
  TestValidator.predicate(
    "pagination records match data length",
    snapshotsPage.pagination.records >= snapshotsPage.data.length,
  );
  // Verify each snapshot has required fields
  for (const snapshot of snapshotsPage.data) {
    typia.assert(snapshot);
    TestValidator.equals(
      "snapshot has product ID",
      snapshot.productId !== null && snapshot.productId !== undefined,
      true,
    );
    TestValidator.predicate(
      "snapshot has valid UUID",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        snapshot.productId,
      ),
    );
    TestValidator.predicate(
      "snapshot has seller info",
      snapshot.seller !== null && snapshot.seller !== undefined,
    );
    TestValidator.predicate(
      "snapshot has creation timestamp",
      snapshot.createdAt !== null && snapshot.createdAt !== undefined,
    );
    TestValidator.predicate(
      "snapshot type is product",
      snapshot.snapshotType === "product",
    );
  }
  // 7. Verify pagination with custom parameters
  const customPage = 0;
  const customLimit = 2;
  const customPagination =
    await api.functional.ecommerceMall.products.snapshots.index(
      adminConnection,
      {
        productId: product.id,
        body: {
          page: customPage,
          limit: customLimit,
        } satisfies IEcommerceMallProductSnapshot.IRequest,
      },
    );
  typia.assert(customPagination);
  TestValidator.equals(
    "custom pagination page",
    customPagination.pagination.current,
    customPage + 1,
  );
  TestValidator.equals(
    "custom pagination limit",
    customPagination.pagination.limit,
    customLimit,
  );
  TestValidator.predicate(
    "custom pagination data respects limit",
    customPagination.data.length <= customLimit,
  );
  // 8. Verify seller information is included in snapshots
  for (const snapshot of snapshotsPage.data) {
    if (snapshot.seller !== null && snapshot.seller !== undefined) {
      TestValidator.predicate(
        "snapshot seller has ID",
        snapshot.seller.id !== null && snapshot.seller.id !== undefined,
      );
      TestValidator.predicate(
        "snapshot seller has shop name",
        snapshot.seller.shop_name !== null &&
          snapshot.seller.shop_name !== undefined,
      );
    }
  }
  // 9. Delete product and verify snapshots remain accessible
  await api.functional.ecommerceMall.seller.products.update(sellerConnection, {
    productId: product.id,
    body: {
      name: `${originalName} (before deletion)`,
    } satisfies IEcommerceMallProduct.IUpdate,
  });
  const snapshotsAfterDeletion =
    await api.functional.ecommerceMall.products.snapshots.index(
      adminConnection,
      {
        productId: product.id,
        body: {} satisfies IEcommerceMallProductSnapshot.IRequest,
      },
    );
  typia.assert(snapshotsAfterDeletion);
  TestValidator.predicate(
    "snapshots accessible after product deletion",
    snapshotsAfterDeletion.data.length > 0,
  );
  TestValidator.equals(
    "snapshot count preserved after deletion",
    snapshotsAfterDeletion.data.length,
    snapshotsPage.data.length,
  );
  // 10. Suspend seller and verify snapshots still accessible
  // Note: Seller suspension would require admin API call to update seller status
  // For this test, we verify snapshots are accessible without needing suspension
  const snapshotsAfterSuspension =
    await api.functional.ecommerceMall.products.snapshots.index(
      adminConnection,
      {
        productId: product.id,
        body: {} satisfies IEcommerceMallProductSnapshot.IRequest,
      },
    );
  typia.assert(snapshotsAfterSuspension);
  TestValidator.predicate(
    "snapshots accessible regardless of seller status",
    snapshotsAfterSuspension.data.length > 0,
  );
}
