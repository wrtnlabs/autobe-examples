import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCustomerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerSession";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfileSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallCustomerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallCustomerSession";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

/**
 * Test the filtered session search functionality with various filter criteria.
 * First, authenticate a seller. Then call the sessions endpoint with specific
 * filters: status='active' to retrieve only non-expired sessions, set createdAtFrom
 * to a past date to filter by creation date range, and set limit to a smaller
 * value (e.g., 5) to test pagination. Verify that only sessions matching the
 * filter criteria are returned. Confirm that status filtering correctly identifies
 * active sessions (where expiredAt is in the future). Test sorting by setting
 * sortOrder to 'desc' to ensure newest sessions appear first. Validate that the
 * response respects the requested limit and that pagination calculations are correct.
 */
export async function test_api_seller_sessions_filtered_search(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as seller to create initial session records and obtain authorization
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: "https://test.example.com/join",
      referrer: "https://test.example.com/",
      ip: null,
    },
  });
  // 2. Test filtered search with active status
  const activeFilter = {
    status: "active" as const,
    limit: 5 satisfies number &
      tags.Type<"int32"> &
      tags.Minimum<1> &
      tags.Maximum<100> as number,
    sortBy: "created_at" as const,
    sortOrder: "desc" as const,
  } satisfies IEcommerceMallCustomerSession.IRequest;
  const activeResult = await api.functional.ecommerceMall.seller.sessions.index(
    sellerConnection,
    { body: activeFilter },
  );
  typia.assert(activeResult);
  // 3. Verify all returned sessions are active (isActive = true)
  for (const session of activeResult.data) {
    TestValidator.predicate(
      "session should be active when filtering by active status",
      session.isActive === true,
    );
  }
  // 4. Validate pagination limit is respected
  TestValidator.predicate(
    "result count should not exceed requested limit",
    activeResult.data.length <= (activeFilter.limit ?? 20),
  );
  // 5. Validate pagination metadata
  TestValidator.equals(
    "pagination should reflect correct limit",
    activeResult.pagination.limit,
    activeFilter.limit ?? 20,
  );
  TestValidator.predicate(
    "current page should be 1 by default",
    activeResult.pagination.current >= 1,
  );
  // 6. Test sorting - verify sessions are in descending order by createdAt
  if (activeResult.data.length >= 2) {
    let sortedCorrectly = true;
    for (let i = 1; i < activeResult.data.length; i++) {
      const prev = new Date(activeResult.data[i - 1].createdAt).getTime();
      const curr = new Date(activeResult.data[i].createdAt).getTime();
      if (prev < curr) {
        sortedCorrectly = false;
        break;
      }
    }
    TestValidator.predicate(
      "sessions should be sorted by createdAt in descending order",
      sortedCorrectly,
    );
  }
  // 7. Test date range filtering with createdAtFrom (24 hours ago)
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const dateFilter = {
    createdAtFrom: oneDayAgo,
    limit: 10 satisfies number &
      tags.Type<"int32"> &
      tags.Minimum<1> &
      tags.Maximum<100> as number,
    sortBy: "created_at" as const,
    sortOrder: "desc" as const,
  } satisfies IEcommerceMallCustomerSession.IRequest;
  const dateResult = await api.functional.ecommerceMall.seller.sessions.index(
    sellerConnection,
    { body: dateFilter },
  );
  typia.assert(dateResult);
  // 8. Verify all returned sessions are created at or after the specified date
  const filterTime = new Date(oneDayAgo).getTime();
  for (const session of dateResult.data) {
    const sessionTime = new Date(session.createdAt).getTime();
    TestValidator.predicate(
      "session createdAt should be >= createdAtFrom filter",
      sessionTime >= filterTime,
    );
  }
  // 9. Validate pagination calculations
  if (dateResult.pagination.records > 0) {
    const expectedPages = Math.ceil(
      dateResult.pagination.records / dateResult.pagination.limit,
    );
    TestValidator.equals(
      "total pages calculation should be correct",
      dateResult.pagination.pages,
      expectedPages,
    );
  }
  // 10. Test expired status filter
  const expiredFilter = {
    status: "expired" as const,
    limit: 5 satisfies number &
      tags.Type<"int32"> &
      tags.Minimum<1> &
      tags.Maximum<100> as number,
  } satisfies IEcommerceMallCustomerSession.IRequest;
  const expiredResult =
    await api.functional.ecommerceMall.seller.sessions.index(sellerConnection, {
      body: expiredFilter,
    });
  typia.assert(expiredResult);
  // Verify all returned sessions are inactive (expired)
  for (const session of expiredResult.data) {
    TestValidator.predicate(
      "session should be inactive when filtering by expired status",
      session.isActive === false,
    );
  }
}
