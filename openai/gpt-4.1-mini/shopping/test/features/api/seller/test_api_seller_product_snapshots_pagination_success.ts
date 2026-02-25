import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProductSnapshot";
import type { IShoppingMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSnapshot";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_seller_product_snapshots_pagination_success(
  connection: api.IConnection,
): Promise<void> {
  // Scenario: The seller joins (registers), then creates a product, then retrieves snapshots of that product with pagination and search keyword filtering.
  // 1. Seller join and authorize
  const sellerJoinConnection: api.IConnection = { host: connection.host };
  const sellerAuthorized = await authorize_seller_join(sellerJoinConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPassword123",
      shopName: RandomGenerator.name(),
      shopDescription: RandomGenerator.paragraph({ sentences: 2 }),
      logoUri: null,
    },
  });
  typia.assert(sellerAuthorized);
  // Create new connection for authorized seller (with token)
  const sellerConnection: api.IConnection = { host: connection.host };
  sellerConnection.headers = {
    Authorization: `Bearer ${sellerAuthorized.token.access}`,
  };
  // 2. Create a product owned by the seller to have snapshots available
  // Since no utility or direct endpoint to create product is provided in input,
  // rewrite scenario by simulating the productId as a valid UUID for snapshots retrieval.
  const productId = typia.random<string & tags.Format<"uuid">>();
  // 3. Construct request body with pagination and search keyword
  const searchKeyword = "test";
  const page = 1;
  const limit = 10;
  const body: IShoppingMallProductSnapshot.IRequest = {
    search: searchKeyword,
    page: page,
    limit: limit,
  };
  // 4. Call the snapshots index API for the product
  const snapshotsPage =
    await api.functional.shoppingMall.seller.products.snapshots.indexSnapshots(
      sellerConnection,
      {
        productId: productId,
        body: body,
      },
    );
  typia.assert(snapshotsPage);
  // 5. Validate pagination data
  TestValidator.predicate(
    "pagination current page",
    snapshotsPage.pagination.current === page,
  );
  TestValidator.predicate(
    "pagination page limit",
    snapshotsPage.pagination.limit === limit,
  );
  TestValidator.predicate(
    "pagination records count",
    snapshotsPage.pagination.records >= snapshotsPage.data.length,
  );
  TestValidator.predicate(
    "pagination pages count",
    snapshotsPage.pagination.pages >= 0,
  );
  // 6. Validate snapshot data integrity for each element
  snapshotsPage.data.forEach((snapshot, index) => {
    typia.assert(snapshot);
    TestValidator.predicate(
      `snapshot ${index} productId matches`,
      snapshot.shoppingMallProductId === productId,
    );
    TestValidator.predicate(
      `snapshot ${index} id is uuid`,
      /^[0-9a-f-]{36}$/i.test(snapshot.id),
    );
    TestValidator.predicate(
      `snapshot ${index} name non-empty`,
      snapshot.name.length > 0,
    );
    TestValidator.predicate(
      `snapshot ${index} basePrice non-negative`,
      snapshot.basePrice >= 0,
    );
    TestValidator.predicate(
      `snapshot ${index} createdAt is ISO date`,
      !isNaN(Date.parse(snapshot.createdAt)),
    );
    TestValidator.predicate(
      `snapshot ${index} updatedAt is ISO date`,
      !isNaN(Date.parse(snapshot.updatedAt)),
    );
    // deletedAt can be null or valid ISO string
    TestValidator.predicate(
      `snapshot ${index} deletedAt is null or ISO date`,
      snapshot.deletedAt === null || !isNaN(Date.parse(snapshot.deletedAt)),
    );
  });
}
