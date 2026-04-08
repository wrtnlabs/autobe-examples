import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerRegistration } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerRegistration";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallSellerRegistration } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallSellerRegistration";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test filtering seller registrations by date range and seller.
 *
 * 1. Authenticate as administrator to obtain JWT access token
 * 2. Test filtering by createdAt date range (from/to timestamps)
 * 3. Test filtering by sellerId parameter
 * 4. Test filtering by reviewerId parameter
 * 5. Test free text search functionality
 * 6. Validate pagination works with filtered results
 */
export async function test_api_seller_registration_filter_by_date_and_seller(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(admin);
  // 2. Test filtering by date range
  const now = new Date();
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const lastWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const dateRangeFilter =
    await api.functional.ecommerceMall.admin.registrations.index(
      adminConnection,
      {
        body: {
          page: 1,
          limit: 20,
          createdAt: {
            from: lastWeek.toISOString(),
            to: yesterday.toISOString(),
          },
        } satisfies IEcommerceMallSellerRegistration.IRequest,
      },
    );
  typia.assert(dateRangeFilter);
  // 3. Test filtering by sellerId
  const randomSellerId = typia.random<string & tags.Format<"uuid">>();
  const sellerFilter =
    await api.functional.ecommerceMall.admin.registrations.index(
      adminConnection,
      {
        body: {
          page: 1,
          limit: 20,
          sellerId: randomSellerId,
        } satisfies IEcommerceMallSellerRegistration.IRequest,
      },
    );
  typia.assert(sellerFilter);
  // 4. Test filtering by reviewerId
  const randomReviewerId = typia.random<string & tags.Format<"uuid">>();
  const reviewerFilter =
    await api.functional.ecommerceMall.admin.registrations.index(
      adminConnection,
      {
        body: {
          page: 1,
          limit: 20,
          reviewerId: randomReviewerId,
        } satisfies IEcommerceMallSellerRegistration.IRequest,
      },
    );
  typia.assert(reviewerFilter);
  // 5. Test free text search
  const searchFilter =
    await api.functional.ecommerceMall.admin.registrations.index(
      adminConnection,
      {
        body: {
          page: 1,
          limit: 20,
          search: RandomGenerator.alphabets(10),
        } satisfies IEcommerceMallSellerRegistration.IRequest,
      },
    );
  typia.assert(searchFilter);
  // 6. Test pagination with page 2 and limit 10
  const paginationFilter =
    await api.functional.ecommerceMall.admin.registrations.index(
      adminConnection,
      {
        body: {
          page: 2,
          limit: 10,
        } satisfies IEcommerceMallSellerRegistration.IRequest,
      },
    );
  typia.assert(paginationFilter);
  // Verify pagination structure
  TestValidator.equals(
    "pagination current page",
    paginationFilter.pagination.current,
    2,
  );
  TestValidator.equals(
    "pagination limit",
    paginationFilter.pagination.limit,
    10,
  );
}
