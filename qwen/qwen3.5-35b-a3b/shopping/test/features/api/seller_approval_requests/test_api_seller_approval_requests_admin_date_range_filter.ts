import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerApprovalRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerApprovalRequest";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallSellerApprovalRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallSellerApprovalRequest";
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

export async function test_api_seller_approval_requests_admin_date_range_filter(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin setup - join automatically authenticates
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallAdmin.IJoin,
  });
  // 2. Create multiple sellers at different times to have varied timestamps
  const sellers: IEcommerceMallSeller.IAuthorized[] = [];
  const sellerCreationTimestamps: string[] = [];
  // Create 3 sellers with sequential delays to ensure different timestamps
  for (let i = 0; i < 3; i++) {
    const sellerConnection: api.IConnection = { host: connection.host };
    const sellerAuthorized = await authorize_seller_join(sellerConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IEcommerceMallSeller.IJoin,
    });
    typia.assert(sellerAuthorized);
    sellers.push(sellerAuthorized);
    sellerCreationTimestamps.push(sellerAuthorized.created_at);
    // Small delay to ensure different timestamps
    await new Promise<void>((resolve) => setTimeout(resolve, 100));
  }
  // 3. Get all approval requests to establish baseline
  const baselineResponse =
    await api.functional.ecommerceMall.seller.approval_requests.index(
      adminConnection,
      { body: {} },
    );
  typia.assert(baselineResponse);
  TestValidator.equals(
    "baseline has all seller approval requests",
    baselineResponse.data.length,
    3,
  );
  // 4. Test created_after filter
  const middleTimestamp = sellerCreationTimestamps[1];
  const createdAfterResponse =
    await api.functional.ecommerceMall.seller.approval_requests.index(
      adminConnection,
      {
        body: {
          created_after: middleTimestamp,
        },
      },
    );
  typia.assert(createdAfterResponse);
  TestValidator.equals(
    "created_after returns correct count",
    createdAfterResponse.data.length,
    2,
  );
  TestValidator.predicate("all returned records created after filter", () =>
    createdAfterResponse.data.every(
      (request) => new Date(request.createdAt) >= new Date(middleTimestamp),
    ),
  );
  // 5. Test created_before filter (should return 0 since earlierTimestamp is the first seller)
  const earlierTimestamp = sellerCreationTimestamps[0];
  const createdBeforeResponse =
    await api.functional.ecommerceMall.seller.approval_requests.index(
      adminConnection,
      {
        body: {
          created_before: earlierTimestamp,
        },
      },
    );
  typia.assert(createdBeforeResponse);
  TestValidator.equals(
    "created_before returns correct count",
    createdBeforeResponse.data.length,
    0,
  );
  // 6. Test sorting by created_at ascending
  const sortByCreatedAtAscResponse =
    await api.functional.ecommerceMall.seller.approval_requests.index(
      adminConnection,
      {
        body: {
          sortBy: "created_at",
          sortOrder: "asc",
        },
      },
    );
  typia.assert(sortByCreatedAtAscResponse);
  TestValidator.predicate(
    "sorting by created_at ascending is correct",
    (() => {
      for (let i = 1; i < sortByCreatedAtAscResponse.data.length; i++) {
        const prev = new Date(sortByCreatedAtAscResponse.data[i - 1].createdAt);
        const curr = new Date(sortByCreatedAtAscResponse.data[i].createdAt);
        if (prev > curr) return false;
      }
      return true;
    })(),
  );
  // 7. Test sorting by created_at descending
  const sortByCreatedAtDescResponse =
    await api.functional.ecommerceMall.seller.approval_requests.index(
      adminConnection,
      {
        body: {
          sortBy: "created_at",
          sortOrder: "desc",
        },
      },
    );
  typia.assert(sortByCreatedAtDescResponse);
  TestValidator.predicate(
    "sorting by created_at descending is correct",
    (() => {
      for (let i = 1; i < sortByCreatedAtDescResponse.data.length; i++) {
        const prev = new Date(
          sortByCreatedAtDescResponse.data[i - 1].createdAt,
        );
        const curr = new Date(sortByCreatedAtDescResponse.data[i].createdAt);
        if (prev < curr) return false;
      }
      return true;
    })(),
  );
  // 8. Test sorting by updated_at ascending
  const sortByUpdatedAtAscResponse =
    await api.functional.ecommerceMall.seller.approval_requests.index(
      adminConnection,
      {
        body: {
          sortBy: "updated_at",
          sortOrder: "asc",
        },
      },
    );
  typia.assert(sortByUpdatedAtAscResponse);
  TestValidator.predicate(
    "sorting by updated_at ascending is correct",
    (() => {
      for (let i = 1; i < sortByUpdatedAtAscResponse.data.length; i++) {
        const prev = new Date(sortByUpdatedAtAscResponse.data[i - 1].updatedAt);
        const curr = new Date(sortByUpdatedAtAscResponse.data[i].updatedAt);
        if (prev > curr) return false;
      }
      return true;
    })(),
  );
  // 9. Test sorting by updated_at descending
  const sortByUpdatedAtDescResponse =
    await api.functional.ecommerceMall.seller.approval_requests.index(
      adminConnection,
      {
        body: {
          sortBy: "updated_at",
          sortOrder: "desc",
        },
      },
    );
  typia.assert(sortByUpdatedAtDescResponse);
  TestValidator.predicate(
    "sorting by updated_at descending is correct",
    (() => {
      for (let i = 1; i < sortByUpdatedAtDescResponse.data.length; i++) {
        const prev = new Date(
          sortByUpdatedAtDescResponse.data[i - 1].updatedAt,
        );
        const curr = new Date(sortByUpdatedAtDescResponse.data[i].updatedAt);
        if (prev < curr) return false;
      }
      return true;
    })(),
  );
  // 10. Test pagination with date range filtering and sorting
  const paginatedResponse =
    await api.functional.ecommerceMall.seller.approval_requests.index(
      adminConnection,
      {
        body: {
          page: 1,
          pageSize: 2,
          sortBy: "created_at",
          sortOrder: "asc",
        },
      },
    );
  typia.assert(paginatedResponse);
  TestValidator.equals(
    "pagination page 1 returns correct count",
    paginatedResponse.data.length,
    2,
  );
  TestValidator.equals(
    "pagination metadata current page",
    paginatedResponse.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination metadata limit",
    paginatedResponse.pagination.limit,
    2,
  );
  TestValidator.equals(
    "pagination metadata total records",
    paginatedResponse.pagination.records,
    3,
  );
  TestValidator.equals(
    "pagination metadata total pages",
    paginatedResponse.pagination.pages,
    2,
  );
  // Get second page
  const secondPageResponse =
    await api.functional.ecommerceMall.seller.approval_requests.index(
      adminConnection,
      {
        body: {
          page: 2,
          pageSize: 2,
          sortBy: "created_at",
          sortOrder: "asc",
        },
      },
    );
  typia.assert(secondPageResponse);
  TestValidator.equals(
    "pagination page 2 returns correct count",
    secondPageResponse.data.length,
    1,
  );
  TestValidator.equals(
    "pagination metadata current page",
    secondPageResponse.pagination.current,
    2,
  );
  // 11. Test combined filter: date range + sorting + pagination
  const combinedFilterResponse =
    await api.functional.ecommerceMall.seller.approval_requests.index(
      adminConnection,
      {
        body: {
          page: 1,
          pageSize: 2,
          created_after: middleTimestamp,
          sortBy: "created_at",
          sortOrder: "desc",
        },
      },
    );
  typia.assert(combinedFilterResponse);
  TestValidator.equals(
    "combined filter returns correct count",
    combinedFilterResponse.data.length,
    1,
  );
  TestValidator.predicate("combined filter respects created_after", () =>
    combinedFilterResponse.data.every(
      (request) => new Date(request.createdAt) >= new Date(middleTimestamp),
    ),
  );
  TestValidator.predicate(
    "combined filter respects sorting",
    (() => {
      for (let i = 1; i < combinedFilterResponse.data.length; i++) {
        const prev = new Date(combinedFilterResponse.data[i - 1].createdAt);
        const curr = new Date(combinedFilterResponse.data[i].createdAt);
        if (prev < curr) return false;
      }
      return true;
    })(),
  );
}