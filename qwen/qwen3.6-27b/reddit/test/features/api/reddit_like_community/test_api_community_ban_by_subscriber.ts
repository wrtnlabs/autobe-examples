import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IREdditLikeCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityCommunity";
import type { IREdditLikeCommunityCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityCommunityBan";
import type { IREdditLikeCommunityCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityCommunityModerator";
import type { IREdditLikeCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_like_community_member_communities_bans_create } from "../../../generate/generate_random_reddit_like_community_member_communities_bans_create";
import { generate_random_reddit_like_community_member_communities_create } from "../../../generate/generate_random_reddit_like_community_member_communities_create";
import { prepare_random_reddit_like_community_community } from "../../../prepare/prepare_random_reddit_like_community_community";
import { prepare_random_reddit_like_community_community_ban } from "../../../prepare/prepare_random_reddit_like_community_community_ban";

/**
 * Test community ban attempt by a regular subscriber.
 *
 * Validates that a regular subscriber without moderation privileges cannot ban members from a community. The test sets up a target member, a regular subscriber, and a community owner who creates the community. The subscriber then attempts to ban the target member, which is expected to fail with a 403 Forbidden response due to insufficient permissions.
 *
 * 1. Register a target member who will be banned.
 * 2. Register a regular subscriber who will attempt the ban.
 * 3. Register a community owner to create the community.
 * 4. Create a community using the owner's credentials.
 * 5. Attempt to ban the target member using the subscriber's credentials.
 * 6. Validate that the request is rejected with a 403 Forbidden error.
 */
export async function test_api_community_ban_by_subscriber(
  connection: api.IConnection,
): Promise<void> {
  // 1. Target member setup
  const targetMemberConnection: api.IConnection = { host: connection.host };
  const targetMember = await authorize_member_join(targetMemberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      username: RandomGenerator.alphabets(8),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IREdditLikeCommunityMember.IJoin,
  });
  // 2. Subscriber setup
  const subscriberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(subscriberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      username: RandomGenerator.alphabets(8),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IREdditLikeCommunityMember.IJoin,
  });
  // 3. Owner setup
  const ownerConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(ownerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      username: RandomGenerator.alphabets(8),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IREdditLikeCommunityMember.IJoin,
  });
  // 4. Create community
  const community =
    await generate_random_reddit_like_community_member_communities_create(
      ownerConnection,
      {},
    );
  typia.assert(community);
  // 5. & 6. Attempt ban and validate 403
  await TestValidator.httpError("subscriber cannot ban", 403, async () => {
    await api.functional.redditLikeCommunity.member.communities.bans.create(
      subscriberConnection,
      {
        communityId: community.id,
        body: {
          member_id: targetMember.id,
          reason: RandomGenerator.paragraph({ sentences: 1 }),
        } satisfies IREdditLikeCommunityCommunityBan.ICreate,
      },
    );
  });
}
