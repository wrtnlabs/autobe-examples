import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import type { IEcommerceMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshot";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallReview";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSnapshotAudit } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSnapshotAudit";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallSnapshotAudit } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallSnapshotAudit";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_ecommerce_mall_seller_products_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_create";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";

export async function test_api_snapshot_audit_seller_date_range_filtering(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create seller account
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  // Use a sample category ID for product creation
  // In real scenario, would fetch from existing categories
  const categoryId = typia.random<string & tags.Format<"uuid">>();
  // 2. Create first product at T1 (creates snapshot at T1)
  const t1 = new Date();
  const product1 = await api.functional.ecommerceMall.seller.products.create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        base_price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1000>
        >(),
        category_id: categoryId,
      },
    },
  );
  typia.assert(product1);
  // Small delay to ensure distinct timestamps
  await new Promise((resolve) => setTimeout(resolve, 100));
  // 3. Update first product at T2 (creates snapshot at T2)
  const t2 = new Date();
  const updatedProduct =
    await api.functional.ecommerceMall.seller.products.update(
      sellerConnection,
      {
        productId: product1.id,
        body: {
          name: RandomGenerator.paragraph({ sentences: 2 }),
          base_price: typia.random<
            number & tags.Type<"uint32"> & tags.Minimum<1000>
          >(),
        },
      },
    );
  typia.assert(updatedProduct);
  // Small delay to ensure distinct timestamps
  await new Promise((resolve) => setTimeout(resolve, 100));
  // 4. Create second product at T3 (creates snapshot at T3)
  const t3 = new Date();
  const product2 = await api.functional.ecommerceMall.seller.products.create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        base_price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1000>
        >(),
        category_id: categoryId,
      },
    },
  );
  typia.assert(product2);
  // 5. Query snapshot audits with date range filter
  // from_changed_at: T2 (inclusive), to_changed_at: after T3 (exclusive)
  const toChangedAt = new Date(t3.getTime() + 1000 * 60 * 60 * 24); // 1 day after T3
  const response =
    await api.functional.ecommerceMall.seller.snapshot_audits.index(
      sellerConnection,
      {
        body: {
          from_changed_at: t2.toISOString(),
          to_changed_at: toChangedAt.toISOString(),
          record_type: ["product"],
        },
      },
    );
  typia.assert(response);
  // 6. Validate filtered results
  const snapshots = response.data;
  // At minimum, we should have the T2 update snapshot and T3 creation snapshot
  TestValidator.predicate(
    "should have at least 2 product snapshots in range",
    snapshots.length >= 2,
  );
  // Verify all snapshots have changed_at within the specified range
  for (const snapshot of snapshots) {
    const changedAt = new Date(snapshot.changed_at);
    TestValidator.predicate(
      `snapshot ${snapshot.id} changed_at >= from_changed_at`,
      changedAt >= t2,
    );
    TestValidator.predicate(
      `snapshot ${snapshot.id} changed_at < to_changed_at`,
      changedAt < toChangedAt,
    );
  }
  // Verify record_type is product for all snapshots
  for (const snapshot of snapshots) {
    TestValidator.equals(
      `snapshot ${snapshot.id} has record_type product`,
      snapshot.record_type,
      "product",
    );
  }
  // Verify actor is the seller who created these products
  for (const snapshot of snapshots) {
    TestValidator.predicate(
      `snapshot ${snapshot.id} has changed_by`,
      snapshot.changed_by !== undefined,
    );
  }
}