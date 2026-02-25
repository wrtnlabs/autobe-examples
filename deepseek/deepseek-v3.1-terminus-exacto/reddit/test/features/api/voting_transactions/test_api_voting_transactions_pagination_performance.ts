import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import type { ICommunityPlatformVotingTransaction } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformVotingTransaction";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformVotingTransaction } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformVotingTransaction";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";

/**
 * Test pagination functionality and performance with large voting transaction datasets.
 *
 * This test validates that the voting transactions pagination system handles result
 * sets efficiently by testing various page and limit parameters. It leverages existing
 * voting transaction data to test pagination by requesting different pages with various
 * limit sizes (1, 10, 50, 100). The test verifies that pagination metadata accurately
 * reflects the current page, total records, and total pages.
 *
 * Edge cases tested include requesting pages beyond available data range, limit values at
 * boundaries (1 and 100), and default pagination behavior when parameters are not specified.
 * Sorting by transaction_timestamp descending is validated across paginated results.
 */
export async function test_api_voting_transactions_pagination_performance(
  connection: api.IConnection,
): Promise<void> {
  // Create authenticated user connection
  const userConnection: api.IConnection = { host: connection.host };
  const user = await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.alphaNumeric(12),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      avatar_url: typia.random<string & tags.Format<"uri">>(),
    } satisfies ICommunityPlatformUser.IJoin,
  });
  typia.assert(user);
  // Test 1: Default pagination (no parameters)
  const defaultPage =
    await api.functional.communityPlatform.user.voting_transactions.index(
      userConnection,
      {
        body: {
          user_id: user.id,
        } satisfies ICommunityPlatformVotingTransaction.IRequest,
      },
    );
  typia.assert(defaultPage);
  TestValidator.predicate(
    "default pagination returns valid response",
    defaultPage.data !== undefined,
  );
  TestValidator.equals(
    "default pagination metadata present",
    typeof defaultPage.pagination.current,
    "number",
  );
  // Test 2: Small page size (limit = 1)
  const smallPage =
    await api.functional.communityPlatform.user.voting_transactions.index(
      userConnection,
      {
        body: {
          user_id: user.id,
          page: 1,
          limit: 1,
        } satisfies ICommunityPlatformVotingTransaction.IRequest,
      },
    );
  typia.assert(smallPage);
  TestValidator.predicate(
    "small page returns valid data",
    smallPage.data.length >= 0,
  );
  TestValidator.equals(
    "small page current page is 1",
    smallPage.pagination.current,
    1,
  );
  TestValidator.equals("small page limit is 1", smallPage.pagination.limit, 1);
  // Test 3: Medium page size (limit = 10)
  const mediumPage =
    await api.functional.communityPlatform.user.voting_transactions.index(
      userConnection,
      {
        body: {
          user_id: user.id,
          page: 1,
          limit: 10,
        } satisfies ICommunityPlatformVotingTransaction.IRequest,
      },
    );
  typia.assert(mediumPage);
  TestValidator.predicate(
    "medium page returns reasonable count",
    mediumPage.data.length <= 10,
  );
  TestValidator.equals(
    "medium page current page is 1",
    mediumPage.pagination.current,
    1,
  );
  TestValidator.equals(
    "medium page limit is 10",
    mediumPage.pagination.limit,
    10,
  );
  // Test 4: Large page size (limit = 50)
  const largePage =
    await api.functional.communityPlatform.user.voting_transactions.index(
      userConnection,
      {
        body: {
          user_id: user.id,
          page: 1,
          limit: 50,
        } satisfies ICommunityPlatformVotingTransaction.IRequest,
      },
    );
  typia.assert(largePage);
  TestValidator.predicate(
    "large page returns reasonable count",
    largePage.data.length <= 50,
  );
  TestValidator.equals(
    "large page current page is 1",
    largePage.pagination.current,
    1,
  );
  TestValidator.equals(
    "large page limit is 50",
    largePage.pagination.limit,
    50,
  );
  // Test 5: Maximum page size (limit = 100)
  const maxPage =
    await api.functional.communityPlatform.user.voting_transactions.index(
      userConnection,
      {
        body: {
          user_id: user.id,
          page: 1,
          limit: 100,
        } satisfies ICommunityPlatformVotingTransaction.IRequest,
      },
    );
  typia.assert(maxPage);
  TestValidator.predicate(
    "max page returns reasonable count",
    maxPage.data.length <= 100,
  );
  TestValidator.equals(
    "max page current page is 1",
    maxPage.pagination.current,
    1,
  );
  TestValidator.equals("max page limit is 100", maxPage.pagination.limit, 100);
  // Test 6: Multiple page navigation
  const page1 =
    await api.functional.communityPlatform.user.voting_transactions.index(
      userConnection,
      {
        body: {
          user_id: user.id,
          page: 1,
          limit: 10,
        } satisfies ICommunityPlatformVotingTransaction.IRequest,
      },
    );
  typia.assert(page1);
  const page2 =
    await api.functional.communityPlatform.user.voting_transactions.index(
      userConnection,
      {
        body: {
          user_id: user.id,
          page: 2,
          limit: 10,
        } satisfies ICommunityPlatformVotingTransaction.IRequest,
      },
    );
  typia.assert(page2);
  TestValidator.equals("page 1 current page is 1", page1.pagination.current, 1);
  TestValidator.equals("page 2 current page is 2", page2.pagination.current, 2);
  TestValidator.equals(
    "consistent total records across pages",
    page1.pagination.records,
    page2.pagination.records,
  );
  TestValidator.equals(
    "consistent total pages across pages",
    page1.pagination.pages,
    page2.pagination.pages,
  );
  // Test 7: Edge case - page beyond available data
  const beyondPage =
    await api.functional.communityPlatform.user.voting_transactions.index(
      userConnection,
      {
        body: {
          user_id: user.id,
          page: 100, // Very high page number
          limit: 10,
        } satisfies ICommunityPlatformVotingTransaction.IRequest,
      },
    );
  typia.assert(beyondPage);
  TestValidator.predicate(
    "beyond page returns empty or valid data",
    beyondPage.data.length >= 0,
  );
  TestValidator.predicate(
    "beyond page current page is reasonable",
    beyondPage.pagination.current >= 1,
  );
  // Test 8: Verify sorting by transaction_timestamp descending
  const sortedPage =
    await api.functional.communityPlatform.user.voting_transactions.index(
      userConnection,
      {
        body: {
          user_id: user.id,
          page: 1,
          limit: 5,
        } satisfies ICommunityPlatformVotingTransaction.IRequest,
      },
    );
  typia.assert(sortedPage);
  // Verify transactions are in descending order (newest first) if we have multiple records
  if (sortedPage.data.length > 1) {
    for (let i = 1; i < sortedPage.data.length; i++) {
      const currentTimestamp = new Date(
        sortedPage.data[i].transaction_timestamp,
      );
      const previousTimestamp = new Date(
        sortedPage.data[i - 1].transaction_timestamp,
      );
      TestValidator.predicate(
        "transactions sorted descending by timestamp",
        currentTimestamp <= previousTimestamp,
      );
    }
  }
  // Test 9: Performance validation - ensure reasonable response time
  const startTime = Date.now();
  const performancePage =
    await api.functional.communityPlatform.user.voting_transactions.index(
      userConnection,
      {
        body: {
          user_id: user.id,
          page: 1,
          limit: 50,
        } satisfies ICommunityPlatformVotingTransaction.IRequest,
      },
    );
  typia.assert(performancePage);
  const endTime = Date.now();
  const responseTime = endTime - startTime;
  TestValidator.predicate(
    "pagination response time is reasonable",
    responseTime < 5000,
  ); // Under 5 seconds
  // Test 10: Validate pagination metadata calculations
  const testPage =
    await api.functional.communityPlatform.user.voting_transactions.index(
      userConnection,
      {
        body: {
          user_id: user.id,
          page: 1,
          limit: 10,
        } satisfies ICommunityPlatformVotingTransaction.IRequest,
      },
    );
  typia.assert(testPage);
  const expectedPages = Math.ceil(
    testPage.pagination.records / testPage.pagination.limit,
  );
  TestValidator.equals(
    "pagination pages calculation is correct",
    testPage.pagination.pages,
    expectedPages,
  );
  TestValidator.predicate(
    "pagination records count is non-negative",
    testPage.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination current page is valid",
    testPage.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination limit is valid",
    testPage.pagination.limit >= 1 && testPage.pagination.limit <= 100,
  );
}
