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

/**
 * Test admin retrieval of paginated seller profile snapshots.
 *
 * 1. Authenticate as admin using join endpoint
 * 2. Create a seller account using join endpoint
 * 3. As admin, retrieve profile snapshots for the seller with pagination
 * 4. Validate paginated response structure and data integrity
 * 5. Test pagination parameters (page, limit) and date range filtering
 */
export async function test_api_seller_profile_snapshot_list_paginated(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin authentication with connection isolation
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IEcommerceMallAdmin.IJoin,
  });
  typia.assert(adminAuth);
  // 2. Create seller account with connection isolation
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: null,
    } satisfies IEcommerceMallSeller.IJoin,
  });
  typia.assert(sellerAuth);
  const sellerId = sellerAuth.id;
  // 3. Test pagination with default parameters (page 1, limit 10)
  const baseRequest: IEcommerceMallSellerProfileSnapshot.IRequest = {
    createdAfter: null,
    createdBefore: null,
    page: 1,
    limit: 10,
  };
  const page1Response =
    await api.functional.ecommerceMall.admin.sellers.profile_snapshots.index(
      adminConnection,
      {
        sellerId: sellerId,
        body: baseRequest,
      },
    );
  typia.assert(page1Response);
  // Validate pagination metadata structure
  const pagination = page1Response.pagination;
  TestValidator.predicate(
    "pagination current is non-negative",
    pagination.current >= 0,
  );
  TestValidator.predicate("pagination limit is positive", pagination.limit > 0);
  TestValidator.predicate(
    "pagination records is non-negative",
    pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is non-negative",
    pagination.pages >= 0,
  );
  // 4. If snapshots exist, validate their structure and ordering
  if (page1Response.data.length > 0) {
    // Validate each snapshot structure - typia.assert handles complete validation
    for (const snapshot of page1Response.data) {
      typia.assert<IEcommerceMallSellerProfileSnapshot.ISummary>(snapshot);
      // Business logic validation: seller reference matches requested seller
      TestValidator.equals(
        "snapshot seller reference matches",
        snapshot.seller.id,
        sellerId,
      );
    }
    // Verify snapshots are ordered by createdAt descending (newest first)
    for (let i = 0; i < page1Response.data.length - 1; i++) {
      const currentCreatedAt = new Date(
        page1Response.data[i]!.createdAt,
      ).getTime();
      const nextCreatedAt = new Date(
        page1Response.data[i + 1]!.createdAt,
      ).getTime();
      TestValidator.predicate(
        `snapshot ordering at index ${i}`,
        currentCreatedAt >= nextCreatedAt,
      );
    }
  }
  // 5. Test with different limit value
  const limit5Request: IEcommerceMallSellerProfileSnapshot.IRequest = {
    createdAfter: null,
    createdBefore: null,
    page: 1,
    limit: 5,
  };
  const limit5Response =
    await api.functional.ecommerceMall.admin.sellers.profile_snapshots.index(
      adminConnection,
      {
        sellerId: sellerId,
        body: limit5Request,
      },
    );
  typia.assert(limit5Response);
  // Validate limit parameter is respected (limit in response matches request or system default)
  TestValidator.equals(
    "response limit matches request",
    limit5Response.pagination.limit,
    5,
  );
  TestValidator.predicate(
    "data length within limit",
    limit5Response.data.length <= 5,
  );
  // 6. Test date range filtering
  const now = new Date();
  const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const dateRangeRequest: IEcommerceMallSellerProfileSnapshot.IRequest = {
    createdAfter: oneWeekAgo.toISOString() as string & tags.Format<"date-time">,
    createdBefore: now.toISOString() as string & tags.Format<"date-time">,
    page: 1,
    limit: 20,
  };
  const dateRangeResponse =
    await api.functional.ecommerceMall.admin.sellers.profile_snapshots.index(
      adminConnection,
      {
        sellerId: sellerId,
        body: dateRangeRequest,
      },
    );
  typia.assert(dateRangeResponse);
  // Validate date range filtering
  const afterTime = new Date(dateRangeRequest.createdAfter!).getTime();
  const beforeTime = new Date(dateRangeRequest.createdBefore!).getTime();
  if (dateRangeResponse.data.length > 0) {
    for (const snapshot of dateRangeResponse.data) {
      const snapshotTime = new Date(snapshot.createdAt).getTime();
      TestValidator.predicate(
        `snapshot ${snapshot.id} within date range`,
        snapshotTime >= afterTime && snapshotTime <= beforeTime,
      );
    }
  }
  // 7. Test pagination boundary - high page number
  const highPageRequest: IEcommerceMallSellerProfileSnapshot.IRequest = {
    createdAfter: null,
    createdBefore: null,
    page: 999,
    limit: 10,
  };
  const highPageResponse =
    await api.functional.ecommerceMall.admin.sellers.profile_snapshots.index(
      adminConnection,
      {
        sellerId: sellerId,
        body: highPageRequest,
      },
    );
  typia.assert(highPageResponse);
  // High page should return empty data array
  TestValidator.equals(
    "high page returns empty data",
    highPageResponse.data.length,
    0,
  );
  TestValidator.equals(
    "high page current matches request",
    highPageResponse.pagination.current,
    999,
  );
}
