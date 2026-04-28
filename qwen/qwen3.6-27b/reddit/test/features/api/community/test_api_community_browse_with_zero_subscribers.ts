import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditLikeCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditLikeCommunityCommunity";
import type { IREdditLikeCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityCommunity";
import type { IREdditLikeCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_like_community_member_communities_create } from "../../../generate/generate_random_reddit_like_community_member_communities_create";
import { prepare_random_reddit_like_community_community } from "../../../prepare/prepare_random_reddit_like_community_community";

/**
 * Test that communities with zero subscribers remain visible in the community browsing list.
 *
 * Validates the complete community browsing workflow to ensure communities with no subscribers
 * are properly included in browsing results. Confirms that the subscriber_count field accurately
 * reflects zero and that all community metadata is properly returned.
 *
 * 1. Register a new member account with unique credentials.
 * 2. Create a new community using the authenticated member.
 * 3. Browse all communities using the community listing endpoint.
 * 4. Validate that the created community appears in the results with subscriber_count = 0.
 */
export async function test_api_community_browse_with_zero_subscribers(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a member account
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IREdditLikeCommunityMember.IJoin,
  });
  // 2. Create a community (no subscribers)
  const community =
    await generate_random_reddit_like_community_member_communities_create(
      memberConnection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 2 }),
          description: RandomGenerator.paragraph({ sentences: 3 }),
        },
      },
    );
  typia.assert(community);
  // 3. Browse all communities
  const browseConnection: api.IConnection = { host: connection.host };
  const browseResult =
    await api.functional.redditLikeCommunity.communities.index(
      browseConnection,
      {
        body: {} satisfies IREdditLikeCommunityCommunity.IRequest,
      },
    );
  typia.assert(browseResult);
  // 4. Validate the community appears with zero subscribers
  const foundCommunity = browseResult.data.find((c) => c.id === community.id);
  typia.assertGuard(foundCommunity!);
  TestValidator.equals(
    "community id matches",
    foundCommunity!.id,
    community.id,
  );
  TestValidator.equals(
    "community name matches",
    foundCommunity!.name,
    community.name,
  );
  TestValidator.equals(
    "subscriber count is zero",
    foundCommunity!.subscriber_count,
    0,
  );
  TestValidator.equals(
    "community description matches",
    foundCommunity!.description,
    community.description,
  );
  TestValidator.predicate(
    "community has valid created_at timestamp",
    foundCommunity!.created_at !== undefined,
  );
  TestValidator.equals(
    "community creator is the creating member",
    foundCommunity!.creator.id,
    community.creator.id,
  );
}