import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallOrderItemSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItemSnapshot";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IJsonObject } from "@ORGANIZATION/PROJECT-api/lib/structures/IJsonObject";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallOrderItemSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallOrderItemSnapshot";
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

export async function test_api_seller_snapshot_date_range_filter(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register seller
  const sellerConnection: api.IConnection = { host: connection.host };
  const auth = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      shop_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallSeller.IJoin,
  });
  typia.assert(auth);
  // 2. Create product (creates first snapshot at T0)
  // Note: prepare_random_ecommerce_mall_product handles category selection internally
  const product = await generate_random_ecommerce_mall_seller_products_create(
    sellerConnection,
    {},
  );
  typia.assert(product);
  const t0 = new Date();
  // 3. Wait briefly and edit product (creates second snapshot at T1)
  await new Promise((resolve) => setTimeout(resolve, 1000));
  const update1 = await api.functional.ecommerceMall.seller.products.update(
    sellerConnection,
    {
      productId: product.id,
      body: {
        name: RandomGenerator.name(),
      } satisfies IEcommerceMallProduct.IUpdate,
    },
  );
  typia.assert(update1);
  const t1 = new Date();
  // 4. Wait briefly and edit product again (creates third snapshot at T2)
  await new Promise((resolve) => setTimeout(resolve, 1000));
  const update2 = await api.functional.ecommerceMall.seller.products.update(
    sellerConnection,
    {
      productId: product.id,
      body: {
        description: RandomGenerator.paragraph({ sentences: 5 }),
      } satisfies IEcommerceMallProduct.IUpdate,
    },
  );
  typia.assert(update2);
  const t2 = new Date();
  // 5. Query snapshots with date range filter (T1 to T2 inclusive)
  const snapshots = await api.functional.ecommerceMall.seller.snapshots.index(
    sellerConnection,
    {
      body: {
        created_at_from: t1.toISOString(),
        created_at_to: t2.toISOString(),
        limit: 100,
      } satisfies IEcommerceMallOrderItemSnapshot.IRequest,
    },
  );
  typia.assert(snapshots);
  // 6. Validate results
  TestValidator.equals("snapshots within date range", snapshots.data.length, 2);
  // Verify all returned snapshots are within the date range
  for (const snapshot of snapshots.data) {
    const snapshotTime = new Date(snapshot.created_at);
    TestValidator.predicate("snapshot >= created_at_from", snapshotTime >= t1);
    TestValidator.predicate("snapshot <= created_at_to", snapshotTime <= t2);
  }
  // Verify results are sorted by created_at descending
  for (let i = 0; i < snapshots.data.length - 1; i++) {
    const current = new Date(snapshots.data[i].created_at);
    const next = new Date(snapshots.data[i + 1].created_at);
    TestValidator.predicate(
      `snapshot[${i}] >= snapshot[${i + 1}]`,
      current >= next,
    );
  }
}
