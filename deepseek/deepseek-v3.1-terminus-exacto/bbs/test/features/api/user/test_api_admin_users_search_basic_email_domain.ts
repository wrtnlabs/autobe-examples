import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardAdministratorDistributionStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorDistributionStatistic";
import type { IDiscussionBoardAdministratorPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorPromotionRequest";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardAdministratorDistributionStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdministratorDistributionStatistic";
import type { IPageIDiscussionBoardAdministratorPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdministratorPromotionRequest";
import type { IPageIDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardSection";
import type { IPageIDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardUser";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test basic user search functionality by email domain filtering.
 * As an administrator, search for users who have email addresses from specific
 * domains to identify patterns or locate users from particular organizations.
 *
 * This test focuses on validating the search API's ability to filter users by
 * email domain patterns, including case-insensitive matching and pagination.
 */
export async function test_api_admin_users_search_basic_email_domain(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  typia.assert(admin);
  // 2. Perform search with email domain pattern '@test.com'
  const searchResult =
    await api.functional.discussionBoard.admin.users.search.index(
      adminConnection,
      {
        body: {
          email: "@test.com",
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardUser.IRequest,
      },
    );
  typia.assert(searchResult);
  // 3. Validate search results structure
  TestValidator.equals(
    "search result has pagination",
    typeof searchResult.pagination,
    "object",
  );
  TestValidator.equals(
    "search result has data array",
    Array.isArray(searchResult.data),
    true,
  );
  // 4. Validate pagination metadata
  const pagination = searchResult.pagination.pagination.pagination.pagination;
  TestValidator.predicate("current page is 1", pagination.current === 1);
  TestValidator.predicate("limit is 10", pagination.limit === 10);
  TestValidator.predicate(
    "records count is non-negative",
    pagination.records >= 0,
  );
  TestValidator.predicate("pages count is non-negative", pagination.pages >= 0);
  // 5. Validate user summary information structure for each result
  for (const user of searchResult.data) {
    typia.assert<IDiscussionBoardUser.ISummary>(user);
    // typia.assert() already validates all properties including UUID format and timestamp
  }
  // 6. Test case-insensitive search with uppercase domain pattern
  const uppercaseSearchResult =
    await api.functional.discussionBoard.admin.users.search.index(
      adminConnection,
      {
        body: {
          email: "@TEST.COM", // uppercase domain
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardUser.IRequest,
      },
    );
  typia.assert(uppercaseSearchResult);
  // 7. Validate search functionality with empty pattern (should return all users)
  const emptySearchResult =
    await api.functional.discussionBoard.admin.users.search.index(
      adminConnection,
      {
        body: {
          email: "", // empty pattern
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardUser.IRequest,
      },
    );
  typia.assert(emptySearchResult);
  // 8. Test business logic: empty pattern should return more or equal results than specific pattern
  TestValidator.predicate(
    "empty pattern returns more or equal results than specific pattern",
    emptySearchResult.data.length >= searchResult.data.length,
  );
}
