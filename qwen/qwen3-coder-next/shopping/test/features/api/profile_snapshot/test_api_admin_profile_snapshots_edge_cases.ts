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

export async function test_api_admin_profile_snapshots_edge_cases(
  connection: api.IConnection,
): Promise<void> {
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: `admin${RandomGenerator.alphaNumeric(8)}@test.com`,
      password: "1234",
    } satisfies IEcommerceMallAdmin.IJoin,
  });
  const sellerId = typia.random<string & tags.Format<"uuid">>();
  // Test 1: Non-existent seller ID (empty result)
  const noSellerSnapshots =
    await api.functional.ecommerceMall.admin.profile.snapshots.index(
      adminConnection,
      {
        body: {
          page: 1,
          limit: 10,
          seller_id: sellerId,
        } satisfies IEcommerceMallShopProfile.IRequest,
      },
    );
  typia.assert(noSellerSnapshots);
  TestValidator.equals(
    "non-existent seller has no snapshots",
    noSellerSnapshots.data.length,
    0,
  );
  // Test 2: 'before' timestamp before any snapshots
  const pastTime = new Date("2020-01-01T00:00:00.000Z").toISOString();
  const beforeSnapshots =
    await api.functional.ecommerceMall.admin.profile.snapshots.index(
      adminConnection,
      {
        body: {
          page: 1,
          limit: 10,
          before: pastTime,
        } satisfies IEcommerceMallShopProfile.IRequest,
      },
    );
  typia.assert(beforeSnapshots);
  TestValidator.equals(
    "before past timestamp has no snapshots",
    beforeSnapshots.data.length,
    0,
  );
  // Test 3: 'after' timestamp after all snapshots
  const futureTime = new Date("2030-01-01T00:00:00.000Z").toISOString();
  const afterSnapshots =
    await api.functional.ecommerceMall.admin.profile.snapshots.index(
      adminConnection,
      {
        body: {
          page: 1,
          limit: 10,
          after: futureTime,
        } satisfies IEcommerceMallShopProfile.IRequest,
      },
    );
  typia.assert(afterSnapshots);
  TestValidator.equals(
    "after future timestamp has no snapshots",
    afterSnapshots.data.length,
    0,
  );
  // Test 4: limit=1 returns exactly 1 item
  const oneItemSnapshots =
    await api.functional.ecommerceMall.admin.profile.snapshots.index(
      adminConnection,
      {
        body: {
          page: 1,
          limit: 1,
        } satisfies IEcommerceMallShopProfile.IRequest,
      },
    );
  typia.assert(oneItemSnapshots);
  TestValidator.equals(
    "limit=1 returns 1 item",
    oneItemSnapshots.data.length,
    1,
  );
  TestValidator.equals(
    "limit=1 pagination",
    oneItemSnapshots.pagination.limit,
    1,
  );
  // Test 5: limit=100 (maximum) works correctly
  const maxLimitSnapshots =
    await api.functional.ecommerceMall.admin.profile.snapshots.index(
      adminConnection,
      {
        body: {
          page: 1,
          limit: 100,
        } satisfies IEcommerceMallShopProfile.IRequest,
      },
    );
  typia.assert(maxLimitSnapshots);
  TestValidator.predicate(
    "limit=100 pagination",
    maxLimitSnapshots.pagination.limit === 100,
  );
  // Test 6: Pagination works for large result sets
  if (maxLimitSnapshots.pagination.records > 0) {
    const page2Snapshots =
      await api.functional.ecommerceMall.admin.profile.snapshots.index(
        adminConnection,
        {
          body: {
            page: 2,
            limit: 10,
          } satisfies IEcommerceMallShopProfile.IRequest,
        },
      );
    typia.assert(page2Snapshots);
    TestValidator.equals("page 2 exists", page2Snapshots.pagination.current, 2);
    TestValidator.predicate("page 2 has data", page2Snapshots.data.length > 0);
  }
  // Test 7: Validate snapshot integrity
  if (maxLimitSnapshots.data.length > 0) {
    const snapshot = maxLimitSnapshots.data[0];
    typia.assert<IEcommerceMallShopProfile.ISummary>(snapshot);
    TestValidator.predicate(
      "has valid created_at",
      new Date(snapshot.created_at).getTime() > 0,
    );
    TestValidator.predicate(
      "has valid updated_at",
      new Date(snapshot.updated_at).getTime() > 0,
    );
    TestValidator.predicate(
      "has valid seller_id",
      /^[0-9a-f-]{36}$/i.test(snapshot.ecommerce_mall_seller_id),
    );
    TestValidator.predicate(
      "has valid shop_profile_id",
      /^[0-9a-f-]{36}$/i.test(snapshot.ecommerce_mall_shop_profile_id),
    );
  }
}
