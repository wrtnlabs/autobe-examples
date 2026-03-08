import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshot";
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

export async function test_api_product_snapshots_seller_own_product_history(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller registration via authorize_seller_join utility
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IEcommerceMallSeller.IJoin,
  });
  typia.assert(sellerAuth);
  // 2. Create a new connection with seller token
  const sellerTokenConnection: api.IConnection = {
    host: connection.host,
    headers: { Authorization: `Bearer ${sellerAuth.token.access}` },
  };
  // 3. Generate a mock product ID for testing
  // Note: Cannot create real products without product creation API in the list
  const productId = typia.random<string & tags.Format<"uuid">>();
  // 4. Test snapshots endpoint with pagination
  const snapshotsPage =
    await api.functional.ecommerceMall.products.snapshots.index(
      sellerTokenConnection,
      {
        productId: productId,
        body: {
          page: 1,
          limit: 20,
          sortBy: "created_at",
          sortOrder: "desc",
        } satisfies IEcommerceMallProductSnapshot.IRequest,
      },
    );
  typia.assert(snapshotsPage);
  // 5. Validate pagination structure
  TestValidator.equals(
    "pagination current page",
    snapshotsPage.pagination.current,
    1,
  );
  TestValidator.equals("pagination limit", snapshotsPage.pagination.limit, 20);
  TestValidator.predicate(
    "pagination records is non-negative",
    snapshotsPage.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is non-negative",
    snapshotsPage.pagination.pages >= 0,
  );
  // 6. Validate snapshots are in descending order by createdAt
  if (snapshotsPage.data.length > 1) {
    for (let i = 0; i < snapshotsPage.data.length - 1; i++) {
      const current = snapshotsPage.data[i];
      const next = snapshotsPage.data[i + 1];
      TestValidator.predicate(
        `snapshot ${i} createdAt >= snapshot ${i + 1} createdAt`,
        new Date(current.createdAt).getTime() >=
          new Date(next.createdAt).getTime(),
      );
    }
  }
  // 7. Validate each snapshot structure
  for (const snapshot of snapshotsPage.data) {
    typia.assert(snapshot);
    // Validate snapshot has seller information (must be the authenticated seller)
    TestValidator.equals(
      "snapshot seller email matches authenticated seller",
      snapshot.seller.email,
      sellerAuth.email,
    );
  }
  // 8. Test pagination with different parameters
  const snapshotsPageLarge =
    await api.functional.ecommerceMall.products.snapshots.index(
      sellerTokenConnection,
      {
        productId: productId,
        body: {
          page: 1,
          limit: 100,
        } satisfies IEcommerceMallProductSnapshot.IRequest,
      },
    );
  typia.assert(snapshotsPageLarge);
  TestValidator.equals(
    "large limit pagination limit",
    snapshotsPageLarge.pagination.limit,
    100,
  );
  // 9. Test date range filtering
  const now = new Date();
  const snapshotsPageWithDates =
    await api.functional.ecommerceMall.products.snapshots.index(
      sellerTokenConnection,
      {
        productId: productId,
        body: {
          page: 1,
          startDate: now.toISOString(),
          endDate: now.toISOString(),
        } satisfies IEcommerceMallProductSnapshot.IRequest,
      },
    );
  typia.assert(snapshotsPageWithDates);
  // 10. Test with category inclusion
  const snapshotsPageWithCategory =
    await api.functional.ecommerceMall.products.snapshots.index(
      sellerTokenConnection,
      {
        productId: productId,
        body: {
          page: 1,
          includeCategory: true,
        } satisfies IEcommerceMallProductSnapshot.IRequest,
      },
    );
  typia.assert(snapshotsPageWithCategory);
  // 11. Validate each snapshot with category has category structure
  for (const snapshot of snapshotsPageWithCategory.data) {
    if (snapshot.category !== null) {
      typia.assert(snapshot.category);
      TestValidator.predicate(
        "category has id",
        snapshot.category.id !== undefined,
      );
      TestValidator.predicate(
        "category has name",
        snapshot.category.name !== undefined,
      );
      TestValidator.predicate(
        "category has is_leaf",
        snapshot.category.is_leaf !== undefined,
      );
    }
  }
}
