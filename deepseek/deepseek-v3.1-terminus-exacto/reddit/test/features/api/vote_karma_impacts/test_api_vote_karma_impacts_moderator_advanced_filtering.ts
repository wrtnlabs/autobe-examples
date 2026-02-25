import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import type { ICommunityPlatformVoteKarmaImpact } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformVoteKarmaImpact";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformVoteKarmaImpact } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformVoteKarmaImpact";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_moderator_join } from "../../../authorize/authorize_moderator_join";
import { authorize_moderator_login } from "../../../authorize/authorize_moderator_login";
import { authorize_moderator_refresh } from "../../../authorize/authorize_moderator_refresh";

export async function test_api_vote_karma_impacts_moderator_advanced_filtering(
  connection: api.IConnection,
): Promise<void> {
  // Create moderator connection
  const moderatorConnection: api.IConnection = { host: connection.host };
  await authorize_moderator_join(moderatorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.alphabets(8),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      avatar_url: typia.random<string & tags.Format<"uri">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies ICommunityPlatformModerator.IJoin,
  });
  // Test time range filtering
  const now = new Date();
  const oneWeekAgo = new Date(
    now.getTime() - 7 * 24 * 60 * 60 * 1000,
  ).toISOString();
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
  const timeFilteredResults =
    await api.functional.communityPlatform.moderator.vote_karma_impacts.index(
      moderatorConnection,
      {
        body: {
          start_time: oneWeekAgo,
          end_time: now.toISOString(),
        } satisfies ICommunityPlatformVoteKarmaImpact.IRequest,
      },
    );
  typia.assert(timeFilteredResults);
  // Test pagination with different parameters
  const paginatedResults =
    await api.functional.communityPlatform.moderator.vote_karma_impacts.index(
      moderatorConnection,
      {
        body: {
          page: 1,
          limit: 10,
        } satisfies ICommunityPlatformVoteKarmaImpact.IRequest,
      },
    );
  typia.assert(paginatedResults);
  // Test combined filters
  const combinedFilterResults =
    await api.functional.communityPlatform.moderator.vote_karma_impacts.index(
      moderatorConnection,
      {
        body: {
          start_time: oneDayAgo,
          end_time: now.toISOString(),
          page: 1,
          limit: 5,
          granularity: "day",
        } satisfies ICommunityPlatformVoteKarmaImpact.IRequest,
      },
    );
  typia.assert(combinedFilterResults);
  // Test edge case: empty result set with future date range
  const futureDate = new Date(
    now.getTime() + 24 * 60 * 60 * 1000,
  ).toISOString();
  const emptyResults =
    await api.functional.communityPlatform.moderator.vote_karma_impacts.index(
      moderatorConnection,
      {
        body: {
          start_time: futureDate,
          end_time: new Date(now.getTime() + 48 * 60 * 60 * 1000).toISOString(),
        } satisfies ICommunityPlatformVoteKarmaImpact.IRequest,
      },
    );
  typia.assert(emptyResults);
  // Validate pagination metadata
  TestValidator.predicate(
    "pagination has valid structure",
    paginatedResults.pagination.current >= 0 &&
      paginatedResults.pagination.limit > 0 &&
      paginatedResults.pagination.records >= 0 &&
      paginatedResults.pagination.pages >= 0,
  );
  // Validate that time filtering produces subset of data
  if (
    timeFilteredResults.data.length > 0 &&
    combinedFilterResults.data.length > 0
  ) {
    TestValidator.predicate(
      "combined filters produce subset",
      combinedFilterResults.data.length <= timeFilteredResults.data.length,
    );
  }
  // Test different page sizes
  const smallPageResults =
    await api.functional.communityPlatform.moderator.vote_karma_impacts.index(
      moderatorConnection,
      {
        body: {
          page: 2,
          limit: 3,
        } satisfies ICommunityPlatformVoteKarmaImpact.IRequest,
      },
    );
  typia.assert(smallPageResults);
  // Test boundary conditions
  const boundaryResults =
    await api.functional.communityPlatform.moderator.vote_karma_impacts.index(
      moderatorConnection,
      {
        body: {
          start_time: now.toISOString(),
          end_time: now.toISOString(),
        } satisfies ICommunityPlatformVoteKarmaImpact.IRequest,
      },
    );
  typia.assert(boundaryResults);
}
