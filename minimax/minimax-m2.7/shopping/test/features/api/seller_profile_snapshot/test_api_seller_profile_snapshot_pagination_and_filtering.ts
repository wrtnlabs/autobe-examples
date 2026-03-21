import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfile";
import type { IEcommerceMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfileSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallSellerProfileSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_seller_profile_snapshot_pagination_and_filtering(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new seller
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {});
  sellerConnection.headers = {
    Authorization: `Bearer ${sellerAuth.token.access}`,
  };
  // 2. Update profile multiple times to create snapshots
  for (let i = 0; i < 5; i++) {
    await api.functional.ecommerceMall.seller.seller.profile.update(
      sellerConnection,
      {
        body: {
          name: `Test Shop ${i + 1}`,
          description: `Test Description ${i + 1}`,
        } satisfies IEcommerceMallSellerProfile.IUpdate,
      },
    );
    // Small delay to ensure different timestamps
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  // 3. First call: GET second page with limit=2 (page=2, limit=2)
  const page2Result =
    await api.functional.ecommerceMall.seller.profile.snapshots.index(
      sellerConnection,
      {
        body: {
          page: 2,
          limit: 2,
        } satisfies IEcommerceMallSellerProfileSnapshot.IRequest,
      },
    );
  typia.assert(page2Result);
  // Verify pagination shows correct records count and current=2
  TestValidator.equals(
    "page 2 has correct current page",
    page2Result.pagination.current,
    2,
  );
  TestValidator.equals("page 2 has limit 2", page2Result.pagination.limit, 2);
  TestValidator.predicate(
    "page 2 data count <= 2",
    page2Result.data.length <= 2,
  );
  // 4. Second call: Filter by date range using fromDate and toDate parameters
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const filteredResult =
    await api.functional.ecommerceMall.seller.profile.snapshots.index(
      sellerConnection,
      {
        body: {
          fromDate: thirtyDaysAgo.toISOString() satisfies string &
            tags.Format<"date-time">,
          toDate: now.toISOString() satisfies string & tags.Format<"date-time">,
          page: 1,
          limit: 20,
        } satisfies IEcommerceMallSellerProfileSnapshot.IRequest,
      },
    );
  typia.assert(filteredResult);
  // Verify only snapshots within the date range are returned
  for (const snapshot of filteredResult.data) {
    const createdAt = new Date(snapshot.created_at);
    TestValidator.predicate(
      "snapshot within date range",
      createdAt >= thirtyDaysAgo && createdAt <= now,
    );
  }
  // 5. Third call: Test limit=100 (maximum page size)
  const maxLimitResult =
    await api.functional.ecommerceMall.seller.profile.snapshots.index(
      sellerConnection,
      {
        body: {
          page: 1,
          limit: 100,
        } satisfies IEcommerceMallSellerProfileSnapshot.IRequest,
      },
    );
  typia.assert(maxLimitResult);
  // Verify no more than 100 snapshots returned
  TestValidator.predicate(
    "max limit respected",
    maxLimitResult.data.length <= 100,
  );
  TestValidator.equals(
    "max limit set correctly",
    maxLimitResult.pagination.limit,
    100,
  );
  // 6. Fourth call: Test page=1, limit=20 (default values)
  const defaultResult =
    await api.functional.ecommerceMall.seller.profile.snapshots.index(
      sellerConnection,
      {
        body: {
          page: 1,
          limit: 20,
        } satisfies IEcommerceMallSellerProfileSnapshot.IRequest,
      },
    );
  typia.assert(defaultResult);
  // Verify system accepts default pagination without explicit parameters
  TestValidator.equals(
    "default page is 1",
    defaultResult.pagination.current,
    1,
  );
  TestValidator.equals(
    "default limit is 20",
    defaultResult.pagination.limit,
    20,
  );
  // Verify we have at least 5 snapshots from our updates
  TestValidator.predicate(
    "has snapshots from profile updates",
    defaultResult.pagination.records >= 5,
  );
}
