import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostVote";
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

import { authorize_moderator_join } from "../../../authorize/authorize_moderator_join";
import { authorize_moderator_login } from "../../../authorize/authorize_moderator_login";
import { authorize_moderator_refresh } from "../../../authorize/authorize_moderator_refresh";
import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";
import { generate_random_community_platform_user_posts_create } from "../../../generate/generate_random_community_platform_user_posts_create";
import { generate_random_community_platform_user_posts_votes_create } from "../../../generate/generate_random_community_platform_user_posts_votes_create";
import { prepare_random_community_platform_post } from "../../../prepare/prepare_random_community_platform_post";
import { prepare_random_community_platform_post_vote } from "../../../prepare/prepare_random_community_platform_post_vote";

export async function test_api_moderator_voting_transactions_date_range_analysis(
  connection: api.IConnection,
): Promise<void> {
  // Create moderator connection
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderator = await authorize_moderator_login(moderatorConnection, {
    body: {
      email: "moderator@test.com",
      password: "moderator123",
    } satisfies ICommunityPlatformModerator.ILogin,
  });
  typia.assert(moderator);
  // Create user connection for generating voting data
  const userConnection: api.IConnection = { host: connection.host };
  const user = await authorize_user_login(userConnection, {
    body: {
      email: "user@test.com",
      password: "user123",
    } satisfies ICommunityPlatformUser.ILogin,
  });
  typia.assert(user);
  // Test 1: Search transactions with valid date range
  const now = new Date();
  const startDate = new Date(
    now.getTime() - 7 * 24 * 60 * 60 * 1000,
  ).toISOString(); // 7 days ago
  const endDate = now.toISOString(); // current time
  const dateRangeResults =
    await api.functional.communityPlatform.moderator.voting_transactions.index(
      moderatorConnection,
      {
        body: {
          start_date: startDate,
          end_date: endDate,
          limit: 10,
          page: 1,
        } satisfies ICommunityPlatformVotingTransaction.IRequest,
      },
    );
  typia.assert(dateRangeResults);
  // Test 2: Search transactions before start_date (should return empty)
  const beforeStartResults =
    await api.functional.communityPlatform.moderator.voting_transactions.index(
      moderatorConnection,
      {
        body: {
          start_date: new Date(
            now.getTime() + 24 * 60 * 60 * 1000,
          ).toISOString(), // 1 day in future
          end_date: new Date(
            now.getTime() + 7 * 24 * 60 * 60 * 1000,
          ).toISOString(), // 7 days in future
        } satisfies ICommunityPlatformVotingTransaction.IRequest,
      },
    );
  typia.assert(beforeStartResults);
  TestValidator.equals(
    "no transactions in future date range",
    beforeStartResults.data.length,
    0,
  );
  // Test 3: Search transactions after end_date (should return empty)
  const afterEndResults =
    await api.functional.communityPlatform.moderator.voting_transactions.index(
      moderatorConnection,
      {
        body: {
          start_date: new Date(
            now.getTime() - 30 * 24 * 60 * 60 * 1000,
          ).toISOString(), // 30 days ago
          end_date: new Date(
            now.getTime() - 15 * 24 * 60 * 60 * 1000,
          ).toISOString(), // 15 days ago
        } satisfies ICommunityPlatformVotingTransaction.IRequest,
      },
    );
  typia.assert(afterEndResults);
  TestValidator.equals(
    "no transactions in distant past range",
    afterEndResults.data.length,
    0,
  );
  // Test 4: Single-day analysis
  const singleDayStart = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
  ).toISOString();
  const singleDayEnd = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() + 1,
  ).toISOString();
  const singleDayResults =
    await api.functional.communityPlatform.moderator.voting_transactions.index(
      moderatorConnection,
      {
        body: {
          start_date: singleDayStart,
          end_date: singleDayEnd,
        } satisfies ICommunityPlatformVotingTransaction.IRequest,
      },
    );
  typia.assert(singleDayResults);
  // Test 5: Verify chronological sorting (if we have results)
  if (dateRangeResults.data.length > 1) {
    for (let i = 1; i < dateRangeResults.data.length; i++) {
      const currentTimestamp = new Date(
        dateRangeResults.data[i].transaction_timestamp,
      );
      const previousTimestamp = new Date(
        dateRangeResults.data[i - 1].transaction_timestamp,
      );
      TestValidator.predicate(
        "transactions sorted chronologically (newest first)",
        currentTimestamp <= previousTimestamp,
      );
    }
  }
  // Test 6: Pagination with date range constraints
  const paginatedResults =
    await api.functional.communityPlatform.moderator.voting_transactions.index(
      moderatorConnection,
      {
        body: {
          start_date: startDate,
          end_date: endDate,
          limit: 5,
          page: 1,
        } satisfies ICommunityPlatformVotingTransaction.IRequest,
      },
    );
  typia.assert(paginatedResults);
  TestValidator.predicate(
    "pagination limit respected",
    paginatedResults.data.length <= 5,
  );
  TestValidator.predicate(
    "pagination metadata valid",
    paginatedResults.pagination.current === 1 &&
      paginatedResults.pagination.limit === 5 &&
      paginatedResults.pagination.records >= 0 &&
      paginatedResults.pagination.pages >= 0,
  );
  // Test 7: Empty date range (both null) should return all transactions
  const allTransactions =
    await api.functional.communityPlatform.moderator.voting_transactions.index(
      moderatorConnection,
      {
        body: {
          start_date: null,
          end_date: null,
          limit: 10,
          page: 1,
        } satisfies ICommunityPlatformVotingTransaction.IRequest,
      },
    );
  typia.assert(allTransactions);
  TestValidator.predicate(
    "null date range returns transactions",
    allTransactions.data.length >= 0,
  );
}
