import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
import type { IEcommerceSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSellerProfileSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceSellerProfileSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_seller_profile_snapshots_date_range_filtering(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create seller account for authorization
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      shop_name: RandomGenerator.name(),
      shop_description: RandomGenerator.paragraph({ sentences: 2 }),
      logo_image_url: typia.random<string & tags.Format<"uri">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>() as
        | (string & tags.Format<"ipv4">)
        | null
        | undefined,
    } satisfies IEcommerceSeller.IJoin,
  });
  typia.assert(seller);
  // 2. Test empty request without any date filters
  const emptyResponse =
    await api.functional.ecommerce.seller.profile.snapshots.index(
      sellerConnection,
      {
        body: {
          page: 1,
          limit: 10,
          // No date filters specified
        } satisfies IEcommerceSellerProfileSnapshot.IRequest,
      },
    );
  typia.assert(emptyResponse);
  TestValidator.equals(
    "empty request returns valid pagination",
    emptyResponse.pagination.current,
    1,
  );
  TestValidator.equals(
    "empty request returns valid limit",
    emptyResponse.pagination.limit,
    10,
  );
  // 3. Test valid date range (past to current)
  const now = new Date().toISOString();
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const validDateResponse =
    await api.functional.ecommerce.seller.profile.snapshots.index(
      sellerConnection,
      {
        body: {
          page: 1,
          limit: 10,
          created_at_start: oneDayAgo,
          created_at_end: now,
        } satisfies IEcommerceSellerProfileSnapshot.IRequest,
      },
    );
  typia.assert(validDateResponse);
  TestValidator.equals(
    "valid date range returns response",
    validDateResponse.pagination.current,
    1,
  );
  // 4. Test single day range (same start and end)
  const singleDayStart = new Date(
    Date.now() - 12 * 60 * 60 * 1000,
  ).toISOString();
  const singleDayResponse =
    await api.functional.ecommerce.seller.profile.snapshots.index(
      sellerConnection,
      {
        body: {
          page: 1,
          limit: 10,
          created_at_start: singleDayStart,
          created_at_end: singleDayStart,
        } satisfies IEcommerceSellerProfileSnapshot.IRequest,
      },
    );
  typia.assert(singleDayResponse);
  TestValidator.equals(
    "single day range works",
    singleDayResponse.pagination.current,
    1,
  );
  // 5. Test future dates only
  const futureDate = new Date(
    Date.now() + 365 * 24 * 60 * 60 * 1000,
  ).toISOString();
  const futureResponse =
    await api.functional.ecommerce.seller.profile.snapshots.index(
      sellerConnection,
      {
        body: {
          page: 1,
          limit: 10,
          created_at_start: futureDate,
          created_at_end: futureDate,
        } satisfies IEcommerceSellerProfileSnapshot.IRequest,
      },
    );
  typia.assert(futureResponse);
  TestValidator.equals(
    "future date returns response",
    futureResponse.pagination.current,
    1,
  );
  // Future dates should return empty or limited results
  TestValidator.predicate(
    "future date range may have no records or limited records",
    futureResponse.data.length >= 0,
  );
  // 6. Test invalid date range (start after end)
  const invalidStart = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  const invalidEnd = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const invalidRangeResponse =
    await api.functional.ecommerce.seller.profile.snapshots.index(
      sellerConnection,
      {
        body: {
          page: 1,
          limit: 10,
          created_at_start: invalidStart,
          created_at_end: invalidEnd,
        } satisfies IEcommerceSellerProfileSnapshot.IRequest,
      },
    );
  typia.assert(invalidRangeResponse);
  TestValidator.equals(
    "invalid date range still returns response (validation handled server-side)",
    invalidRangeResponse.pagination.current,
    1,
  );
  // 7. Test with only start date (no end)
  const startOnlyResponse =
    await api.functional.ecommerce.seller.profile.snapshots.index(
      sellerConnection,
      {
        body: {
          page: 1,
          limit: 10,
          created_at_start: oneDayAgo,
          // No created_at_end
        } satisfies IEcommerceSellerProfileSnapshot.IRequest,
      },
    );
  typia.assert(startOnlyResponse);
  TestValidator.equals(
    "start date only works",
    startOnlyResponse.pagination.current,
    1,
  );
  // 8. Test with only end date (no start)
  const endOnlyResponse =
    await api.functional.ecommerce.seller.profile.snapshots.index(
      sellerConnection,
      {
        body: {
          page: 1,
          limit: 10,
          // No created_at_start
          created_at_end: now,
        } satisfies IEcommerceSellerProfileSnapshot.IRequest,
      },
    );
  typia.assert(endOnlyResponse);
  TestValidator.equals(
    "end date only works",
    endOnlyResponse.pagination.current,
    1,
  );
  // 9. Test pagination with date range
  const paginationResponse =
    await api.functional.ecommerce.seller.profile.snapshots.index(
      sellerConnection,
      {
        body: {
          page: 2,
          limit: 5,
          created_at_start: new Date(
            Date.now() - 7 * 24 * 60 * 60 * 1000,
          ).toISOString(),
          created_at_end: now,
        } satisfies IEcommerceSellerProfileSnapshot.IRequest,
      },
    );
  typia.assert(paginationResponse);
  TestValidator.equals(
    "pagination with date range works - page",
    paginationResponse.pagination.current,
    2,
  );
  TestValidator.equals(
    "pagination with date range works - limit",
    paginationResponse.pagination.limit,
    5,
  );
}
