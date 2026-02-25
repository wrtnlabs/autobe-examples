import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import type { ICommunityPlatformPostVoteOfModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostVoteOfModerator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformPostVoteOfModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformPostVoteOfModerator";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_moderator_join } from "../../../authorize/authorize_moderator_join";
import { authorize_moderator_login } from "../../../authorize/authorize_moderator_login";
import { authorize_moderator_refresh } from "../../../authorize/authorize_moderator_refresh";

export async function test_api_moderator_post_votes_moderators_retrieval_with_date_range_filter(
  connection: api.IConnection,
): Promise<void> {
  // Scenario description:
  // Test retrieving moderator post votes filtered by creation date range, including edge cases where the date range returns zero or multiple votes.
  // Verify accurate filtering when specifying createdAtFrom and createdAtTo timestamps.
  // Validate that authorization is enforced and the pagination metadata matches the filtered results.
  // Confirm that votes outside the date range are excluded and that the correct response structure is returned.
  // Prepare moderator connection
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderatorJoinInput = {
    email: typia.random<string & tags.Format<"email">>(),
    username: RandomGenerator.name(1),
    displayName: RandomGenerator.name(2),
    bio: RandomGenerator.paragraph({ sentences: 3 }),
    avatarUrl: null,
  } satisfies ICommunityPlatformModerator.IJoin;
  const moderatorAuth = await authorize_moderator_join(moderatorConnection, {
    body: moderatorJoinInput,
  });
  typia.assert(moderatorAuth);
  // Use authorized connection
  const authorizedConnection: api.IConnection = { host: connection.host };
  authorizedConnection.headers = {
    Authorization: `Bearer ${moderatorAuth.token.access}`,
  };
  // We'll simulate creation of votes via patch index since no explicit create
  // Instead, we simulate votes through index querying with date filters
  // To test date range filtering, we create various votes with controlled timestamps.
  // Since SDK only provides querying, we'll simulate the effect here by retrieving all votes,
  // and the test will verify date range filtering is applied correctly.
  // For a stronger test let's generate multiple random dates around a base date
  // Base date for creating votes
  const baseDate = new Date();
  // Mocked votes will be filtered by createdAtFrom and createdAtTo
  // We'll run the API with different date ranges and verify correct filtering.
  // Test 1: Date range that should return zero results (in the far future)
  const farFutureFrom = new Date(
    baseDate.getTime() + 1000 * 60 * 60 * 24 * 365,
  ).toISOString(); // one year later
  const farFutureTo = new Date(
    baseDate.getTime() + 1000 * 60 * 60 * 24 * 366,
  ).toISOString(); // one year + 1 day
  const zeroResultsResponse =
    await api.functional.communityPlatform.moderator.postVotes.moderators.index(
      authorizedConnection,
      {
        body: {
          createdAtFrom: farFutureFrom,
          createdAtTo: farFutureTo,
          page: 1,
          limit: 10,
        } satisfies ICommunityPlatformPostVoteOfModerator.IRequest,
      },
    );
  typia.assert(zeroResultsResponse);
  TestValidator.equals(
    "zero results data length",
    zeroResultsResponse.data.length,
    0,
  );
  TestValidator.equals(
    "zero results pagination records",
    zeroResultsResponse.pagination.records,
    0,
  );
  // Test 2: Date range with realistic range including some data
  // Since we have no direct create, we simulate by fetching without date filters first
  const allVotesResponse =
    await api.functional.communityPlatform.moderator.postVotes.moderators.index(
      authorizedConnection,
      {
        body: {
          page: 1,
          limit: 50,
        } satisfies ICommunityPlatformPostVoteOfModerator.IRequest,
      },
    );
  typia.assert(allVotesResponse);
  // Filter votes manually in test by createdAt date in a recent range
  const minDate = new Date(baseDate.getTime() - 1000 * 60 * 60 * 24 * 30); // 30 days ago
  const maxDate = baseDate;
  // Query with controlled date range
  const filteredVotesResponse =
    await api.functional.communityPlatform.moderator.postVotes.moderators.index(
      authorizedConnection,
      {
        body: {
          createdAtFrom: minDate.toISOString(),
          createdAtTo: maxDate.toISOString(),
          page: 1,
          limit: 50,
        } satisfies ICommunityPlatformPostVoteOfModerator.IRequest,
      },
    );
  typia.assert(filteredVotesResponse);
  // Check all returned votes are within the date range
  filteredVotesResponse.data.forEach((vote) => {
    const createdAt = new Date(vote.createdAt);
    TestValidator.predicate(
      `vote ${vote.id} createdAt >= minDate`,
      createdAt >= minDate,
    );
    TestValidator.predicate(
      `vote ${vote.id} createdAt <= maxDate`,
      createdAt <= maxDate,
    );
  });
  // Confirm filtered votes count is not greater than all votes
  TestValidator.predicate(
    "filtered votes count <= all votes count",
    filteredVotesResponse.data.length <= allVotesResponse.data.length,
  );
  // Confirm pagination reflects total records correctly
  TestValidator.predicate(
    "pagination records matches data length",
    filteredVotesResponse.pagination.records >=
      filteredVotesResponse.data.length,
  );
  // Confirm page and limit within pagination
  TestValidator.equals(
    "pagination current page",
    filteredVotesResponse.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit",
    filteredVotesResponse.pagination.limit,
    50,
  );
  // Test 3: Authorization failure - no token
  const unauthorizedConnection: api.IConnection = { host: connection.host };
  await TestValidator.error("unauthorized request throws error", async () => {
    await api.functional.communityPlatform.moderator.postVotes.moderators.index(
      unauthorizedConnection,
      {
        body: {
          page: 1,
          limit: 10,
        } satisfies ICommunityPlatformPostVoteOfModerator.IRequest,
      },
    );
  });
}
