import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
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

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_seller_profile_snapshots_pagination_with_date_filter(
  connection: api.IConnection,
): Promise<void> {
  // Create seller connection and authenticate
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {});
  typia.assert(seller);
  // Test 1: Basic pagination with default parameters
  const defaultPage =
    await api.functional.ecommerceMall.seller.profile.snapshots.index(
      sellerConnection,
      {
        body: {
          seller_id: null,
          created_at_min: null,
          created_at_max: null,
          page: 1,
          limit: 10,
          sort: null,
        } satisfies IEcommerceMallSellerProfileSnapshot.IRequest,
      },
    );
  typia.assert(defaultPage);
  TestValidator.equals("current page is 1", defaultPage.pagination.current, 1);
  // Test 2: Pagination with custom limit
  const customLimit =
    await api.functional.ecommerceMall.seller.profile.snapshots.index(
      sellerConnection,
      {
        body: {
          seller_id: null,
          created_at_min: null,
          created_at_max: null,
          page: 1,
          limit: 5,
          sort: null,
        } satisfies IEcommerceMallSellerProfileSnapshot.IRequest,
      },
    );
  typia.assert(customLimit);
  TestValidator.equals("custom limit applied", customLimit.pagination.limit, 5);
  // Test 3: Sort by created_at ascending
  const sortedAsc =
    await api.functional.ecommerceMall.seller.profile.snapshots.index(
      sellerConnection,
      {
        body: {
          seller_id: null,
          created_at_min: null,
          created_at_max: null,
          page: 1,
          limit: 10,
          sort: "created_at_asc",
        } satisfies IEcommerceMallSellerProfileSnapshot.IRequest,
      },
    );
  typia.assert(sortedAsc);
  // Test 4: Sort by created_at descending
  const sortedDesc =
    await api.functional.ecommerceMall.seller.profile.snapshots.index(
      sellerConnection,
      {
        body: {
          seller_id: null,
          created_at_min: null,
          created_at_max: null,
          page: 1,
          limit: 10,
          sort: "created_at_desc",
        } satisfies IEcommerceMallSellerProfileSnapshot.IRequest,
      },
    );
  typia.assert(sortedDesc);
  // Test 5: Date range filtering
  const now = new Date().toISOString();
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const dateFiltered =
    await api.functional.ecommerceMall.seller.profile.snapshots.index(
      sellerConnection,
      {
        body: {
          seller_id: null,
          created_at_min: yesterday,
          created_at_max: now,
          page: 1,
          limit: 10,
          sort: null,
        } satisfies IEcommerceMallSellerProfileSnapshot.IRequest,
      },
    );
  typia.assert(dateFiltered);
  // Test 6: Pagination with specific seller_id filter (own snapshots)
  const ownSnapshots =
    await api.functional.ecommerceMall.seller.profile.snapshots.index(
      sellerConnection,
      {
        body: {
          seller_id: seller.id,
          created_at_min: null,
          created_at_max: null,
          page: 1,
          limit: 10,
          sort: null,
        } satisfies IEcommerceMallSellerProfileSnapshot.IRequest,
      },
    );
  typia.assert(ownSnapshots);
  // Validate pagination metadata is properly structured
  TestValidator.predicate(
    "pagination has current",
    defaultPage.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination has limit",
    defaultPage.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "pagination has records",
    defaultPage.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination has pages",
    defaultPage.pagination.pages >= 0,
  );
}
