import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSellerProfileSnapshot";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
import type { IShoppingMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfileSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

/**
 * Test administrator filtering of seller profile snapshots by date range.
 *
 * This test validates that administrators can retrieve seller profile snapshots
 * filtered by creation timestamp using fromDate and toDate parameters.
 *
 * Test flow:
 * 1. Create administrator account and authenticate
 * 2. Create seller account and authenticate
 * 3. Update seller profile multiple times to create snapshots
 * 4. Test date range filtering with various scenarios:
 *    - Filter including all snapshots
 *    - Filter including middle snapshots only
 *    - Filter with fromDate equal to snapshot created_at (inclusive)
 *    - Filter with toDate equal to snapshot created_at (inclusive)
 *    - Filter excluding all snapshots (empty result)
 * 5. Validate pagination metadata reflects filtered counts
 */
export async function test_api_seller_profile_snapshot_date_range_filtering(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate administrator
  const adminConnection: api.IConnection = { host: connection.host };
  const adminCredentials = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdministrator.IJoin;
  await authorize_administrator_join(adminConnection, {
    body: adminCredentials,
  });
  const adminLogin = await authorize_administrator_login(adminConnection, {
    body: {
      email: adminCredentials.email,
      password: adminCredentials.password,
    } satisfies IShoppingMallAdministrator.ILogin,
  });
  // 2. Create seller account
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = RandomGenerator.alphaNumeric(16);
  await authorize_seller_join(sellerConnection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallSeller.IJoin,
  });
  const sellerLogin = await authorize_seller_login(sellerConnection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallSeller.ILogin,
  });
  const sellerId = sellerLogin.id;
  // 3. Update seller profile multiple times to create snapshots
  const snapshotTimestamps: string[] = [];
  // First profile update
  const update1 = await api.functional.shoppingMall.sellers.profile.update(
    sellerConnection,
    {
      body: {
        shop_name: RandomGenerator.name(2),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        logo_image_uri: typia.assert<string & tags.MaxLength<80000> & tags.Format<"uri">>(typia.random<string & tags.Format<"uri">>()),
      } satisfies IShoppingMallSellerProfile.IUpdate,
    },
  );
  typia.assert(update1);
  snapshotTimestamps.push(update1.updated_at);
  // Wait briefly to ensure different timestamps
  await new Promise((resolve) => setTimeout(resolve, 100));
  // Second profile update
  const update2 = await api.functional.shoppingMall.sellers.profile.update(
    sellerConnection,
    {
      body: {
        shop_name: RandomGenerator.name(2),
        description: RandomGenerator.paragraph({ sentences: 4 }),
      } satisfies IShoppingMallSellerProfile.IUpdate,
    },
  );
  typia.assert(update2);
  snapshotTimestamps.push(update2.updated_at);
  // Wait briefly
  await new Promise((resolve) => setTimeout(resolve, 100));
  // Third profile update
  const update3 = await api.functional.shoppingMall.sellers.profile.update(
    sellerConnection,
    {
      body: {
        shop_name: RandomGenerator.name(2),
        logo_image_uri: typia.assert<string & tags.MaxLength<80000> & tags.Format<"uri">>(typia.random<string & tags.Format<"uri">>()),
      } satisfies IShoppingMallSellerProfile.IUpdate,
    },
  );
  typia.assert(update3);
  snapshotTimestamps.push(update3.updated_at);
  // 4. Test date range filtering
  // Test 4a: Filter including all snapshots (wide date range)
  const allSnapshots =
    await api.functional.shoppingMall.administrator.sellers.profile.snapshots.index(
      adminConnection,
      {
        sellerId: sellerId,
        body: {
          page: 1,
          limit: 10,
        } satisfies IShoppingMallSellerProfileSnapshot.IRequest,
      },
    );
  typia.assert(allSnapshots);
  TestValidator.predicate(
    "all snapshots retrieved",
    allSnapshots.data.length >= 3,
  );
  TestValidator.equals(
    "total records matches data length",
    allSnapshots.pagination.records,
    allSnapshots.data.length,
  );
  // Test 4b: Filter with fromDate in the middle (should get earlier snapshots only)
  const middleDate = snapshotTimestamps[1];
  const fromDateFilter =
    await api.functional.shoppingMall.administrator.sellers.profile.snapshots.index(
      adminConnection,
      {
        sellerId: sellerId,
        body: {
          page: 1,
          limit: 10,
          fromDate: middleDate,
        } satisfies IShoppingMallSellerProfileSnapshot.IRequest,
      },
    );
  typia.assert(fromDateFilter);
  TestValidator.predicate(
    "fromDate filter returns snapshots",
    fromDateFilter.data.length > 0,
  );
  TestValidator.equals(
    "fromDate pagination records",
    fromDateFilter.pagination.records,
    fromDateFilter.data.length,
  );
  // Verify all returned snapshots have created_at >= fromDate
  for (const snapshot of fromDateFilter.data) {
    TestValidator.predicate(
      `snapshot ${snapshot.id} created_at >= fromDate`,
      new Date(snapshot.created_at).getTime() >= new Date(middleDate).getTime(),
    );
  }
  // Test 4c: Filter with toDate in the middle (should get later snapshots only)
  const toDateFilter =
    await api.functional.shoppingMall.administrator.sellers.profile.snapshots.index(
      adminConnection,
      {
        sellerId: sellerId,
        body: {
          page: 1,
          limit: 10,
          toDate: middleDate,
        } satisfies IShoppingMallSellerProfileSnapshot.IRequest,
      },
    );
  typia.assert(toDateFilter);
  // Verify all returned snapshots have created_at <= toDate
  for (const snapshot of toDateFilter.data) {
    TestValidator.predicate(
      `snapshot ${snapshot.id} created_at <= toDate`,
      new Date(snapshot.created_at).getTime() <= new Date(middleDate).getTime(),
    );
  }
  // Test 4d: Filter with both fromDate and toDate (narrow range)
  const rangeFilter =
    await api.functional.shoppingMall.administrator.sellers.profile.snapshots.index(
      adminConnection,
      {
        sellerId: sellerId,
        body: {
          page: 1,
          limit: 10,
          fromDate: snapshotTimestamps[0],
          toDate: snapshotTimestamps[2],
        } satisfies IShoppingMallSellerProfileSnapshot.IRequest,
      },
    );
  typia.assert(rangeFilter);
  TestValidator.predicate(
    "range filter returns snapshots",
    rangeFilter.data.length > 0,
  );
  TestValidator.equals(
    "range pagination records",
    rangeFilter.pagination.records,
    rangeFilter.data.length,
  );
  // Verify all snapshots are within range
  for (const snapshot of rangeFilter.data) {
    TestValidator.predicate(
      `snapshot ${snapshot.id} within date range`,
      new Date(snapshot.created_at).getTime() >=
        new Date(snapshotTimestamps[0]).getTime() &&
        new Date(snapshot.created_at).getTime() <=
          new Date(snapshotTimestamps[2]).getTime(),
    );
  }
  // Test 4e: Filter excluding all snapshots (date range in the future)
  const futureDate = new Date(
    Date.now() + 1000 * 60 * 60 * 24 * 365,
  ).toISOString(); // 1 year in future
  const emptyFilter =
    await api.functional.shoppingMall.administrator.sellers.profile.snapshots.index(
      adminConnection,
      {
        sellerId: sellerId,
        body: {
          page: 1,
          limit: 10,
          fromDate: futureDate,
        } satisfies IShoppingMallSellerProfileSnapshot.IRequest,
      },
    );
  typia.assert(emptyFilter);
  TestValidator.equals(
    "future date filter returns empty",
    emptyFilter.data.length,
    0,
  );
  TestValidator.equals(
    "empty result pagination records",
    emptyFilter.pagination.records,
    0,
  );
  TestValidator.equals(
    "empty result pagination pages",
    emptyFilter.pagination.pages,
    0,
  );
  // Test 4f: Filter excluding all snapshots (date range in the past)
  const pastDate = new Date(
    Date.now() - 1000 * 60 * 60 * 24 * 365,
  ).toISOString(); // 1 year in past
  const pastFilter =
    await api.functional.shoppingMall.administrator.sellers.profile.snapshots.index(
      adminConnection,
      {
        sellerId: sellerId,
        body: {
          page: 1,
          limit: 10,
          toDate: pastDate,
        } satisfies IShoppingMallSellerProfileSnapshot.IRequest,
      },
    );
  typia.assert(pastFilter);
  TestValidator.equals(
    "past date filter returns empty",
    pastFilter.data.length,
    0,
  );
  TestValidator.equals(
    "past result pagination records",
    pastFilter.pagination.records,
    0,
  );
}