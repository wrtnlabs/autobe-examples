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
 * Test administrator pagination through seller profile snapshot history.
 *
 * This test verifies:
 * 1. Administrator can authenticate and access seller profile snapshots
 * 2. Multiple profile updates create corresponding snapshots
 * 3. Pagination works correctly with limit=5 across 13 snapshots (3 pages)
 * 4. Each page returns correct metadata and snapshot count
 * 5. Snapshots are ordered by created_at in descending order
 * 6. Boundary case: requesting page beyond available pages returns empty data
 */
export async function test_api_seller_profile_snapshot_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallAdministrator.IJoin,
  });
  // 2. Create a seller account
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallSeller.IJoin,
  });
  const sellerId = sellerAuth.id;
  // 3. Make many profile updates to create snapshots (13 updates, more than limit=5)
  const totalSnapshots = 13;
  const limit = 5;
  for (let i = 0; i < totalSnapshots; i++) {
    await api.functional.shoppingMall.sellers.profile.update(sellerConnection, {
      body: {
        shop_name: `Shop ${i} - ${RandomGenerator.name()}`,
        description: RandomGenerator.paragraph({ sentences: 2 }),
        logo_image_uri: typia.random<string & tags.MaxLength<80000> & tags.Format<"uri">>(),
      } satisfies IShoppingMallSellerProfile.IUpdate,
    });
  }
  // 4. Get snapshots with pagination (page=1, limit=5)
  const page1 =
    await api.functional.shoppingMall.administrator.sellers.profile.snapshots.index(
      adminConnection,
      {
        sellerId,
        body: {
          page: 1,
          limit,
        } satisfies IShoppingMallSellerProfileSnapshot.IRequest,
      },
    );
  typia.assert(page1);
  // 5. Validate pagination metadata for page 1
  TestValidator.equals("page 1 current", page1.pagination.current, 1);
  TestValidator.equals("page 1 limit", page1.pagination.limit, limit);
  TestValidator.equals(
    "page 1 records",
    page1.pagination.records,
    totalSnapshots,
  );
  TestValidator.equals(
    "page 1 pages",
    page1.pagination.pages,
    Math.ceil(totalSnapshots / limit),
  );
  TestValidator.equals("page 1 data length", page1.data.length, limit);
  // 6. Get page 2
  const page2 =
    await api.functional.shoppingMall.administrator.sellers.profile.snapshots.index(
      adminConnection,
      {
        sellerId,
        body: {
          page: 2,
          limit,
        } satisfies IShoppingMallSellerProfileSnapshot.IRequest,
      },
    );
  typia.assert(page2);
  TestValidator.equals("page 2 current", page2.pagination.current, 2);
  TestValidator.equals("page 2 data length", page2.data.length, limit);
  // 7. Get page 3 (last page with fewer items)
  const page3 =
    await api.functional.shoppingMall.administrator.sellers.profile.snapshots.index(
      adminConnection,
      {
        sellerId,
        body: {
          page: 3,
          limit,
        } satisfies IShoppingMallSellerProfileSnapshot.IRequest,
      },
    );
  typia.assert(page3);
  TestValidator.equals("page 3 current", page3.pagination.current, 3);
  TestValidator.equals(
    "page 3 data length",
    page3.data.length,
    totalSnapshots - limit * 2,
  );
  // 8. Verify snapshots are in descending created_at order across all pages
  const allSnapshots = [...page1.data, ...page2.data, ...page3.data];
  for (let i = 1; i < allSnapshots.length; i++) {
    TestValidator.predicate(
      `snapshot ${i} created_at <= snapshot ${i - 1} created_at`,
      new Date(allSnapshots[i].created_at).getTime() <=
        new Date(allSnapshots[i - 1].created_at).getTime(),
    );
  }
  // 9. Test boundary case: page beyond available pages returns empty data
  const pageBeyond =
    await api.functional.shoppingMall.administrator.sellers.profile.snapshots.index(
      adminConnection,
      {
        sellerId,
        body: {
          page: 100,
          limit,
        } satisfies IShoppingMallSellerProfileSnapshot.IRequest,
      },
    );
  typia.assert(pageBeyond);
  TestValidator.equals("page beyond data length", pageBeyond.data.length, 0);
  TestValidator.equals(
    "page beyond current",
    pageBeyond.pagination.current,
    100,
  );
}