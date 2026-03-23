import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallShopProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShopProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallShopProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallShopProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_profile_snapshots_pagination(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection for authentication
  const adminConnection: api.IConnection = { host: connection.host };
  const adminUser = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
    } satisfies IEcommerceMallAdmin.IJoin,
  });
  typia.assert(adminUser);
  // Generate multiple sellers with snapshots for testing pagination
  const sellers: {
    id: string;
  }[] = ArrayUtil.repeat(3, () => ({
    id: typia.random<string & tags.Format<"uuid">>(),
  }));
  // Create multiple snapshots for each seller to have enough data for pagination
  const allSnapshots: Array<IEcommerceMallShopProfile.ISummary> = [];
  const now = new Date();
  // Create 5 snapshots per seller with different timestamps
  for (const seller of sellers) {
    for (let i = 0; i < 5; i++) {
      const timestamp = new Date(now.getTime() - i * 1000 * 60 * 60); // 1 hour apart
      const snapshot: IEcommerceMallShopProfile.ISummary = {
        created_at: timestamp.toISOString(),
        updated_at: timestamp.toISOString(),
        ecommerce_mall_seller_id: seller.id,
        ecommerce_mall_shop_profile_id: typia.random<
          string & tags.Format<"uuid">
        >(),
      };
      allSnapshots.push(snapshot);
    }
  }
  // Test 1: Basic pagination with page=1, limit=10
  const page1Result =
    await api.functional.ecommerceMall.admin.profile.snapshots.index(
      adminConnection,
      {
        body: {
          page: 1,
          limit: 10,
        } satisfies IEcommerceMallShopProfile.IRequest,
      },
    );
  typia.assert(page1Result);
  // Validate pagination metadata for page 1
  TestValidator.equals("page 1 current", page1Result.pagination.current, 1);
  TestValidator.equals("page 1 limit", page1Result.pagination.limit, 10);
  TestValidator.predicate(
    "page 1 records >= 10",
    page1Result.pagination.records >= 10,
  );
  // Test 2: Pagination with different page number
  const page2Result =
    await api.functional.ecommerceMall.admin.profile.snapshots.index(
      adminConnection,
      {
        body: {
          page: 2,
          limit: 5,
        } satisfies IEcommerceMallShopProfile.IRequest,
      },
    );
  typia.assert(page2Result);
  TestValidator.equals("page 2 current", page2Result.pagination.current, 2);
  TestValidator.equals("page 2 limit", page2Result.pagination.limit, 5);
  // Test 3: Filtering by seller_id
  const sellerId = sellers[0].id;
  const sellerResult =
    await api.functional.ecommerceMall.admin.profile.snapshots.index(
      adminConnection,
      {
        body: {
          page: 1,
          limit: 20,
          seller_id: sellerId,
        } satisfies IEcommerceMallShopProfile.IRequest,
      },
    );
  typia.assert(sellerResult);
  // Validate all returned snapshots belong to the specified seller
  for (const snapshot of sellerResult.data) {
    TestValidator.equals(
      "seller_id filter",
      snapshot.ecommerce_mall_seller_id,
      sellerId,
    );
  }
  // Test 4: Timestamp-based filtering with 'before'
  const beforeTimestamp = new Date(
    now.getTime() - 5000 * 60 * 60,
  ).toISOString(); // 5 hours ago
  const beforeResult =
    await api.functional.ecommerceMall.admin.profile.snapshots.index(
      adminConnection,
      {
        body: {
          page: 1,
          limit: 20,
          before: beforeTimestamp,
        } satisfies IEcommerceMallShopProfile.IRequest,
      },
    );
  typia.assert(beforeResult);
  // All returned snapshots should be before the timestamp (newer snapshots filtered out)
  for (const snapshot of beforeResult.data) {
    TestValidator.predicate(
      "before timestamp filter",
      snapshot.created_at < beforeTimestamp,
    );
  }
  // Test 5: Timestamp-based filtering with 'after'
  const afterTimestamp = new Date(now.getTime() - 3000 * 60 * 60).toISOString(); // 3 hours ago
  const afterResult =
    await api.functional.ecommerceMall.admin.profile.snapshots.index(
      adminConnection,
      {
        body: {
          page: 1,
          limit: 20,
          after: afterTimestamp,
        } satisfies IEcommerceMallShopProfile.IRequest,
      },
    );
  typia.assert(afterResult);
  // All returned snapshots should be after the timestamp (older snapshots filtered out)
  for (const snapshot of afterResult.data) {
    TestValidator.predicate(
      "after timestamp filter",
      snapshot.created_at > afterTimestamp,
    );
  }
  // Test 6: Verify snapshots are ordered by created_at descending (newest first)
  const descendingResult =
    await api.functional.ecommerceMall.admin.profile.snapshots.index(
      adminConnection,
      {
        body: {
          page: 1,
          limit: 20,
        } satisfies IEcommerceMallShopProfile.IRequest,
      },
    );
  typia.assert(descendingResult);
  // Check that timestamps are in descending order
  for (let i = 0; i < descendingResult.data.length - 1; i++) {
    const current = descendingResult.data[i].created_at;
    const next = descendingResult.data[i + 1].created_at;
    TestValidator.predicate("descending order", current >= next);
  }
  // Test 7: Validate snapshot structure
  for (const snapshot of descendingResult.data) {
    TestValidator.predicate(
      "has created_at",
      typeof snapshot.created_at === "string" && snapshot.created_at.length > 0,
    );
    TestValidator.predicate(
      "has updated_at",
      typeof snapshot.updated_at === "string" && snapshot.updated_at.length > 0,
    );
    TestValidator.predicate(
      "has seller_id",
      typeof snapshot.ecommerce_mall_seller_id === "string" &&
        snapshot.ecommerce_mall_seller_id.length > 0,
    );
    TestValidator.predicate(
      "has profile_id",
      typeof snapshot.ecommerce_mall_shop_profile_id === "string" &&
        snapshot.ecommerce_mall_shop_profile_id.length > 0,
    );
  }
  // Test 8: Verify pagination calculation (pages = ceil(records / limit))
  const calculationResult =
    await api.functional.ecommerceMall.admin.profile.snapshots.index(
      adminConnection,
      {
        body: {
          page: 1,
          limit: 7, // Use odd number to test ceiling calculation
        } satisfies IEcommerceMallShopProfile.IRequest,
      },
    );
  typia.assert(calculationResult);
  const expectedPages = Math.ceil(calculationResult.pagination.records / 7);
  TestValidator.equals(
    "pages calculation",
    calculationResult.pagination.pages,
    expectedPages,
  );
}
