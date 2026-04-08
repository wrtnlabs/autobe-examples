import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdministrator";
import type { IEcommerceMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallMember";
import type { IEcommerceMallUserBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallUserBan";
import type { IEcommerceMallUserBanOfCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallUserBanOfCustomer";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallUserBanOfCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallUserBanOfCustomer";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_administrator_customer_ban_search(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator setup
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_administrator_join(adminConnection, {
    body: {
      display_name: RandomGenerator.name(2),
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      grade: "regular",
    } satisfies IEcommerceMallAdministrator.IJoin,
  });
  typia.assert(adminAuth);
  adminConnection.headers = {
    ...adminConnection.headers,
    Authorization: adminAuth.token.access,
  };
  // 2. Test search with empty request (should return all bans with pagination)
  const allBansResult =
    await api.functional.ecommerceMall.administrator.user_ban_of_customers.index(
      adminConnection,
      {
        body: {} satisfies IEcommerceMallUserBanOfCustomer.IRequest,
      },
    );
  typia.assert(allBansResult);
  TestValidator.predicate(
    "empty request returns pagination metadata",
    allBansResult.pagination !== null,
  );
  TestValidator.equals(
    "default page is 1",
    allBansResult.pagination.current,
    1,
  );
  TestValidator.equals(
    "default limit is 10",
    allBansResult.pagination.limit,
    10,
  );
  // 3. Test search by customer_email (partial match)
  const searchEmail = typia.random<string & tags.Format<"email">>();
  const emailSearchResult =
    await api.functional.ecommerceMall.administrator.user_ban_of_customers.index(
      adminConnection,
      {
        body: {
          customer_email: searchEmail satisfies string as string,
        } satisfies IEcommerceMallUserBanOfCustomer.IRequest,
      },
    );
  typia.assert(emailSearchResult);
  TestValidator.predicate(
    "email search returns valid response",
    emailSearchResult.data !== null,
  );
  TestValidator.predicate(
    "email search has valid pagination",
    emailSearchResult.pagination !== null,
  );
  // 4. Test search by reason (partial match)
  const searchReason = RandomGenerator.paragraph({ sentences: 1 });
  const reasonSearchResult =
    await api.functional.ecommerceMall.administrator.user_ban_of_customers.index(
      adminConnection,
      {
        body: {
          reason: searchReason,
        } satisfies IEcommerceMallUserBanOfCustomer.IRequest,
      },
    );
  typia.assert(reasonSearchResult);
  TestValidator.predicate(
    "reason search returns valid response",
    reasonSearchResult.data !== null,
  );
  TestValidator.predicate(
    "reason search has valid pagination",
    reasonSearchResult.pagination !== null,
  );
  // 5. Test search by ban_status (active)
  const activeSearchResult =
    await api.functional.ecommerceMall.administrator.user_ban_of_customers.index(
      adminConnection,
      {
        body: {
          ban_status: "active",
        } satisfies IEcommerceMallUserBanOfCustomer.IRequest,
      },
    );
  typia.assert(activeSearchResult);
  TestValidator.predicate(
    "active search returns valid response",
    activeSearchResult.data !== null,
  );
  TestValidator.predicate(
    "active search has valid pagination",
    activeSearchResult.pagination !== null,
  );
  // 6. Test search by ban_status (all)
  const allStatusSearchResult =
    await api.functional.ecommerceMall.administrator.user_ban_of_customers.index(
      adminConnection,
      {
        body: {
          ban_status: "all",
        } satisfies IEcommerceMallUserBanOfCustomer.IRequest,
      },
    );
  typia.assert(allStatusSearchResult);
  TestValidator.predicate(
    "all status search returns valid response",
    allStatusSearchResult.data !== null,
  );
  TestValidator.predicate(
    "all status search has valid pagination",
    allStatusSearchResult.pagination !== null,
  );
  // 7. Test search by administrator_id
  const adminIdSearchResult =
    await api.functional.ecommerceMall.administrator.user_ban_of_customers.index(
      adminConnection,
      {
        body: {
          administrator_id: adminAuth.id,
        } satisfies IEcommerceMallUserBanOfCustomer.IRequest,
      },
    );
  typia.assert(adminIdSearchResult);
  TestValidator.predicate(
    "admin id search returns valid response",
    adminIdSearchResult.data !== null,
  );
  TestValidator.predicate(
    "admin id search has valid pagination",
    adminIdSearchResult.pagination !== null,
  );
  // 8. Combined filters
  const combinedResult =
    await api.functional.ecommerceMall.administrator.user_ban_of_customers.index(
      adminConnection,
      {
        body: {
          customer_email: searchEmail satisfies string as string,
          ban_status: "active",
          administrator_id: adminAuth.id,
        } satisfies IEcommerceMallUserBanOfCustomer.IRequest,
      },
    );
  typia.assert(combinedResult);
  TestValidator.predicate(
    "combined filters returns valid response",
    combinedResult.data !== null,
  );
  TestValidator.predicate(
    "combined filters has valid pagination",
    combinedResult.pagination !== null,
  );
  // 9. Pagination with filters
  const paginatedResult =
    await api.functional.ecommerceMall.administrator.user_ban_of_customers.index(
      adminConnection,
      {
        body: {
          customer_email: searchEmail satisfies string as string,
          page: 1,
          limit: 10,
        } satisfies IEcommerceMallUserBanOfCustomer.IRequest,
      },
    );
  typia.assert(paginatedResult);
  TestValidator.equals(
    "pagination metadata present",
    paginatedResult.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit respected",
    paginatedResult.pagination.limit,
    10,
  );
  TestValidator.predicate(
    "pagination records non-negative",
    paginatedResult.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages non-negative",
    paginatedResult.pagination.pages >= 0,
  );
  // 10. No matches returns empty with valid pagination
  const noMatchResult =
    await api.functional.ecommerceMall.administrator.user_ban_of_customers.index(
      adminConnection,
      {
        body: {
          customer_email: "nonexistent_user_12345",
        } satisfies IEcommerceMallUserBanOfCustomer.IRequest,
      },
    );
  typia.assert(noMatchResult);
  TestValidator.equals(
    "no match returns empty data",
    noMatchResult.data.length,
    0,
  );
  TestValidator.equals(
    "no match pagination records zero",
    noMatchResult.pagination.records,
    0,
  );
  TestValidator.equals(
    "no match pagination pages zero",
    noMatchResult.pagination.pages,
    0,
  );
  // 11. Test customer_display_name filter
  const displayNameSearch = RandomGenerator.name(2);
  const displayNameResult =
    await api.functional.ecommerceMall.administrator.user_ban_of_customers.index(
      adminConnection,
      {
        body: {
          customer_display_name: displayNameSearch,
        } satisfies IEcommerceMallUserBanOfCustomer.IRequest,
      },
    );
  typia.assert(displayNameResult);
  TestValidator.predicate(
    "display name search returns valid response",
    displayNameResult.data !== null,
  );
  TestValidator.predicate(
    "display name search has valid pagination",
    displayNameResult.pagination !== null,
  );
  // 12. Test date range filtering
  const currentDate = new Date();
  const bannedAtStart = currentDate.toISOString();
  const bannedAtEnd = currentDate.toISOString();
  const dateRangeResult =
    await api.functional.ecommerceMall.administrator.user_ban_of_customers.index(
      adminConnection,
      {
        body: {
          banned_at_start: bannedAtStart,
          banned_at_end: bannedAtEnd,
        } satisfies IEcommerceMallUserBanOfCustomer.IRequest,
      },
    );
  typia.assert(dateRangeResult);
  TestValidator.predicate(
    "date range search returns valid response",
    dateRangeResult.data !== null,
  );
  TestValidator.predicate(
    "date range search has valid pagination",
    dateRangeResult.pagination !== null,
  );
  // 13. Test different pagination page
  const page2Result =
    await api.functional.ecommerceMall.administrator.user_ban_of_customers.index(
      adminConnection,
      {
        body: {
          page: 2,
          limit: 10,
        } satisfies IEcommerceMallUserBanOfCustomer.IRequest,
      },
    );
  typia.assert(page2Result);
  TestValidator.equals(
    "page 2 pagination current is 2",
    page2Result.pagination.current,
    2,
  );
  TestValidator.equals(
    "page 2 pagination limit is 10",
    page2Result.pagination.limit,
    10,
  );
  // 14. Test max limit
  const maxLimitResult =
    await api.functional.ecommerceMall.administrator.user_ban_of_customers.index(
      adminConnection,
      {
        body: {
          limit: 100,
        } satisfies IEcommerceMallUserBanOfCustomer.IRequest,
      },
    );
  typia.assert(maxLimitResult);
  TestValidator.equals(
    "max limit pagination limit is 100",
    maxLimitResult.pagination.limit,
    100,
  );
}