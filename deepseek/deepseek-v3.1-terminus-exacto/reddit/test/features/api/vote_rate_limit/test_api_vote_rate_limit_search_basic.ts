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

export async function test_api_vote_rate_limit_search_basic(
  connection: api.IConnection,
): Promise<void> {
  // Authenticate as moderator
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
  // Search vote rate limits with minimal parameters
  const response =
    await api.functional.communityPlatform.moderator.vote_rate_limits.index(
      moderatorConnection,
      {
        body: {
          page: 1,
          limit: 10,
        } satisfies ICommunityPlatformVoteRateLimit.IRequest,
      },
    );
  typia.assert(response);
  // Validate pagination business logic
  TestValidator.equals("current page is 1", response.pagination.current, 1);
  TestValidator.equals("limit is 10", response.pagination.limit, 10);
  TestValidator.predicate(
    "records count matches or exceeds data length",
    response.pagination.records >= response.data.length,
  );
  TestValidator.predicate(
    "pages calculation is correct",
    response.pagination.pages ===
      Math.ceil(response.pagination.records / response.pagination.limit),
  );
  // Validate data array business logic
  TestValidator.predicate(
    "data length respects pagination limit",
    response.data.length <= response.pagination.limit,
  );
  // Validate each vote rate limit summary business logic
  for (const rateLimit of response.data) {
    typia.assert(rateLimit);
    // Business logic validation only (not type validation)
    TestValidator.predicate(
      "entity type is post or comment",
      rateLimit.entity_type === "post" || rateLimit.entity_type === "comment",
    );
    TestValidator.predicate(
      "vote type is upvote or downvote",
      rateLimit.vote_type === "upvote" || rateLimit.vote_type === "downvote",
    );
    // Validate user summary business logic
    TestValidator.predicate(
      "user has valid karma score",
      rateLimit.user.karma >= 0,
    );
  }
}
