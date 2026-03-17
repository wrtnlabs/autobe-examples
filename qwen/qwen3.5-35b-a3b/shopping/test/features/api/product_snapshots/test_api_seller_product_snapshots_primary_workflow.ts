import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
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

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_ecommerce_mall_seller_products_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_create";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";

export async function test_api_seller_product_snapshots_primary_workflow(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create seller and join the platform
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller: IEcommerceMallSeller.IAuthorized = await authorize_seller_join(
    sellerConnection,
    {},
  );
  typia.assert(seller);
  // 2. Create a product (this creates the first snapshot)
  const product: IEcommerceMallProduct =
    await generate_random_ecommerce_mall_seller_products_create(
      sellerConnection,
      {
        body: {
          description: typia.random<string & tags.MaxLength<10000>>(),
          base_price: typia.random<
            number & tags.Type<"uint32"> & tags.Minimum<1000>
          >(),
        },
      },
    );
  typia.assert(product);
  // 3. Retrieve snapshot history with pagination
  const snapshotRequest: IEcommerceMallProductSnapshot.IRequest = {
    page: 1,
    limit: 20,
    sortBy: "created_at",
    sortOrder: "desc",
  } satisfies IEcommerceMallProductSnapshot.IRequest;
  const snapshotResponse: IPageIEcommerceMallProductSnapshot.ISummary =
    await api.functional.ecommerceMall.seller.products.snapshots.index(
      sellerConnection,
      {
        productId: product.id,
        body: snapshotRequest,
      },
    );
  typia.assert(snapshotResponse);
  // 4. Validate pagination metadata
  const pagination: IPage.IPagination = snapshotResponse.pagination;
  TestValidator.equals("current page is 1", pagination.current, 1);
  TestValidator.equals("limit matches request", pagination.limit, 20);
  TestValidator.predicate("records is positive", pagination.records > 0);
  TestValidator.predicate("pages is positive", pagination.pages > 0);
  // 5. Validate snapshot count and data
  const snapshots: IEcommerceMallProductSnapshot.ISummary[] =
    snapshotResponse.data;
  TestValidator.equals(
    "has at least one snapshot",
    snapshots.length >= 1,
    true,
  );
  // 6. Verify snapshots are sorted by created_at descending (newest first)
  for (let i = 1; i < snapshots.length; i++) {
    const prevCreatedAt = new Date(snapshots[i - 1].created_at).getTime();
    const currCreatedAt = new Date(snapshots[i].created_at).getTime();
    TestValidator.predicate(
      `snapshot ${i} should be older than ${i - 1}`,
      currCreatedAt <= prevCreatedAt,
    );
  }
  // 7. Verify each snapshot contains required product data
  for (const snapshot of snapshots) {
    typia.assert(snapshot);
    TestValidator.predicate("snapshot has name", snapshot.name.length > 0);
    TestValidator.predicate("snapshot has base_price", snapshot.base_price > 0);
    TestValidator.predicate("snapshot has status", snapshot.status.length > 0);
    TestValidator.predicate(
      "snapshot has valid created_at",
      new Date(snapshot.created_at).getTime() > 0,
    );
  }
}
