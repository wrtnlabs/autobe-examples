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

export async function test_api_vote_rate_limit_search_filter_by_user(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as moderator
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
  // 2. Search with specific filters: user ID, entity_type='post', vote_type='upvote'
  const searchRequest = {
    community_platform_user_id: typia.random<string & tags.Format<"uuid">>(),
    entity_type: "post" as const,
    vote_type: "upvote" as const,
    ip_address: typia.random<string & tags.Format<"ipv4">>(),
    voted_at_start: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // 24 hours ago
    voted_at_end: new Date().toISOString(),
    page: 1,
    limit: 10,
  } satisfies ICommunityPlatformVoteRateLimit.IRequest;
  const searchResult =
    await api.functional.communityPlatform.moderator.vote_rate_limits.index(
      moderatorConnection,
      { body: searchRequest },
    );
  typia.assert(searchResult);
  // 3. Test edge case: null user ID to see all users
  const allUsersSearch = {
    community_platform_user_id: null,
    entity_type: "post" as const,
    vote_type: "upvote" as const,
    page: 1,
    limit: 5,
  } satisfies ICommunityPlatformVoteRateLimit.IRequest;
  const allUsersResult =
    await api.functional.communityPlatform.moderator.vote_rate_limits.index(
      moderatorConnection,
      { body: allUsersSearch },
    );
  typia.assert(allUsersResult);
  // 4. Test IP address filtering
  const ipSearch = {
    ip_address: typia.random<string & tags.Format<"ipv4">>(),
    entity_type: "comment" as const,
    vote_type: "downvote" as const,
    page: 1,
    limit: 5,
  } satisfies ICommunityPlatformVoteRateLimit.IRequest;
  const ipResult =
    await api.functional.communityPlatform.moderator.vote_rate_limits.index(
      moderatorConnection,
      { body: ipSearch },
    );
  typia.assert(ipResult);
}
