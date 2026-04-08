import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfileSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallSellerProfileSnapshot";
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

export async function test_api_seller_profile_snapshot_date_range_filtering(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(admin);
  // 2. Create seller connection - this generates a profile snapshot
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: null,
    },
  });
  typia.assert(seller);
  const sellerId = seller.id;
  // 3. Get all snapshots (no date filter = broad range) as baseline
  const allSnapshots =
    await api.functional.ecommerceMall.admin.sellers.profile_snapshots.index(
      adminConnection,
      {
        sellerId,
        body: {
          createdAfter: null,
          createdBefore: null,
          page: null,
          limit: null,
        } satisfies IEcommerceMallSellerProfileSnapshot.IRequest,
      },
    );
  typia.assert(allSnapshots);
  TestValidator.predicate(
    "all snapshots returned",
    allSnapshots.data.length > 0,
  );
  // 4. Test broad date range - should return same results
  const now = new Date();
  const pastDate = new Date(
    now.getTime() - 365 * 24 * 60 * 60 * 1000,
  ).toISOString(); // 1 year ago
  const futureDate = new Date(
    now.getTime() + 365 * 24 * 60 * 60 * 1000,
  ).toISOString(); // 1 year future
  const broadRangeResult =
    await api.functional.ecommerceMall.admin.sellers.profile_snapshots.index(
      adminConnection,
      {
        sellerId,
        body: {
          createdAfter: pastDate,
          createdBefore: futureDate,
          page: 1,
          limit: 100,
        } satisfies IEcommerceMallSellerProfileSnapshot.IRequest,
      },
    );
  typia.assert(broadRangeResult);
  // 5. Test narrow date range - created within last minute around snapshot
  const baselineSnapshot = allSnapshots.data[0];
  const snapshotTime = new Date(baselineSnapshot.createdAt);
  const oneMinuteBefore = new Date(
    snapshotTime.getTime() - 60 * 1000,
  ).toISOString();
  const oneMinuteAfter = new Date(
    snapshotTime.getTime() + 60 * 1000,
  ).toISOString();
  const narrowRangeResult =
    await api.functional.ecommerceMall.admin.sellers.profile_snapshots.index(
      adminConnection,
      {
        sellerId,
        body: {
          createdAfter: oneMinuteBefore,
          createdBefore: oneMinuteAfter,
          page: 1,
          limit: 100,
        } satisfies IEcommerceMallSellerProfileSnapshot.IRequest,
      },
    );
  typia.assert(narrowRangeResult);
  TestValidator.predicate(
    "narrow range returns results",
    narrowRangeResult.data.length >= 1,
  );
  // Verify returned snapshot is within the specified time range - business logic validation
  narrowRangeResult.data.forEach((snapshot) => {
    const createdAt = new Date(snapshot.createdAt);
    const afterTime = new Date(oneMinuteBefore);
    const beforeTime = new Date(oneMinuteAfter);
    TestValidator.predicate(
      `snapshot ${snapshot.id} createdAt within narrow range`,
      createdAt >= afterTime && createdAt <= beforeTime,
    );
  });
  // 6. Test empty result - future date range with no snapshots
  const farFutureStart = new Date(
    now.getTime() + 1000 * 365 * 24 * 60 * 60 * 1000,
  ).toISOString(); // 1000 years future
  const farFutureEnd = new Date(
    now.getTime() + 1001 * 365 * 24 * 60 * 60 * 1000,
  ).toISOString();
  const emptyResult =
    await api.functional.ecommerceMall.admin.sellers.profile_snapshots.index(
      adminConnection,
      {
        sellerId,
        body: {
          createdAfter: farFutureStart,
          createdBefore: farFutureEnd,
          page: 1,
          limit: 10,
        } satisfies IEcommerceMallSellerProfileSnapshot.IRequest,
      },
    );
  typia.assert(emptyResult);
  TestValidator.equals(
    "empty result for future dates",
    emptyResult.data.length,
    0,
  );
  // 7. Test past date range - should return empty (no snapshots before seller creation)
  const farPastStart = new Date(
    now.getTime() - 1000 * 365 * 24 * 60 * 60 * 1000,
  ).toISOString(); // 1000 years ago
  const farPastEnd = new Date(
    now.getTime() - 999 * 365 * 24 * 60 * 60 * 1000,
  ).toISOString();
  const pastEmptyResult =
    await api.functional.ecommerceMall.admin.sellers.profile_snapshots.index(
      adminConnection,
      {
        sellerId,
        body: {
          createdAfter: farPastStart,
          createdBefore: farPastEnd,
          page: 1,
          limit: 10,
        } satisfies IEcommerceMallSellerProfileSnapshot.IRequest,
      },
    );
  typia.assert(pastEmptyResult);
  TestValidator.equals(
    "empty result for past dates before creation",
    pastEmptyResult.data.length,
    0,
  );
}
