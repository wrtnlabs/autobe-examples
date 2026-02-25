import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import type { ICommunityPlatformVoteRateLimit } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformVoteRateLimit";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformVoteRateLimit } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformVoteRateLimit";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_moderator_join } from "../../../authorize/authorize_moderator_join";
import { authorize_moderator_login } from "../../../authorize/authorize_moderator_login";
import { authorize_moderator_refresh } from "../../../authorize/authorize_moderator_refresh";

export async function test_api_vote_rate_limit_search_date_range_abuse_detection(
  connection: api.IConnection,
): Promise<void> {
  // Create moderator connection and authenticate
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderator = await authorize_moderator_join(moderatorConnection, {
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
  typia.assert(moderator);
  // Create search request with date range filtering
  const now = new Date();
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
  const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);
  const searchRequest = {
    entity_type: "comment" as const,
    vote_type: "downvote" as const,
    ip_address: typia.random<string & tags.Format<"ipv4">>(),
    voted_at_start: twoHoursAgo.toISOString(),
    voted_at_end: oneHourAgo.toISOString(),
    page: typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>(),
    limit: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
    >(),
  } satisfies ICommunityPlatformVoteRateLimit.IRequest;
  // Execute search
  const searchResult =
    await api.functional.communityPlatform.moderator.vote_rate_limits.index(
      moderatorConnection,
      { body: searchRequest },
    );
  typia.assert(searchResult);
  // Validate pagination structure
  TestValidator.equals(
    "pagination structure",
    typeof searchResult.pagination,
    "object",
  );
  TestValidator.predicate(
    "has current page",
    searchResult.pagination.current >= 0,
  );
  TestValidator.predicate("has limit", searchResult.pagination.limit >= 0);
  TestValidator.predicate(
    "has records count",
    searchResult.pagination.records >= 0,
  );
  TestValidator.predicate(
    "has pages count",
    searchResult.pagination.pages >= 0,
  );
  // Validate data array
  TestValidator.predicate("has data array", Array.isArray(searchResult.data));
  // Validate each record in the response
  for (const record of searchResult.data) {
    typia.assert(record);
    // Validate entity_type filter
    TestValidator.equals(
      "entity_type matches filter",
      record.entity_type,
      "comment",
    );
    // Validate vote_type filter
    TestValidator.equals(
      "vote_type matches filter",
      record.vote_type,
      "downvote",
    );
    // Validate voted_at is within date range
    const votedAt = new Date(record.voted_at);
    const startDate = new Date(searchRequest.voted_at_start!);
    const endDate = new Date(searchRequest.voted_at_end!);
    TestValidator.predicate("voted_at after start date", votedAt >= startDate);
    TestValidator.predicate("voted_at before end date", votedAt <= endDate);
    // Validate user structure
    typia.assert(record.user);
    TestValidator.predicate("user has id", typeof record.user.id === "string");
    TestValidator.predicate(
      "user has username",
      typeof record.user.username === "string",
    );
    TestValidator.predicate(
      "user has karma",
      typeof record.user.karma === "number",
    );
    TestValidator.predicate(
      "user has created_at",
      typeof record.user.created_at === "string",
    );
  }
  // Test pagination functionality only if multiple pages exist
  if (
    searchResult.pagination.pages > 1 &&
    searchResult.pagination.current < searchResult.pagination.pages
  ) {
    const nextPageRequest = {
      ...searchRequest,
      page: searchResult.pagination.current + 1,
    } satisfies ICommunityPlatformVoteRateLimit.IRequest;
    const nextPageResult =
      await api.functional.communityPlatform.moderator.vote_rate_limits.index(
        moderatorConnection,
        { body: nextPageRequest },
      );
    typia.assert(nextPageResult);
    TestValidator.equals(
      "next page current",
      nextPageResult.pagination.current,
      searchResult.pagination.current + 1,
    );
    TestValidator.equals(
      "same limit",
      nextPageResult.pagination.limit,
      searchResult.pagination.limit,
    );
    TestValidator.equals(
      "same total records",
      nextPageResult.pagination.records,
      searchResult.pagination.records,
    );
  }
}
