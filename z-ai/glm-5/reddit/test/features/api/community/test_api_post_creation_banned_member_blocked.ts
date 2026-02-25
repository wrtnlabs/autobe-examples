import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBan";
import type { ICommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityCommunity";
import type { ICommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityMember";
import type { ICommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPost";
import type { ICommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunitySubscription";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_community_member_communities_bans_create } from "../../../generate/generate_random_community_member_communities_bans_create";
import { generate_random_community_member_communities_create } from "../../../generate/generate_random_community_member_communities_create";
import { generate_random_community_member_communities_posts_create } from "../../../generate/generate_random_community_member_communities_posts_create";
import { prepare_random_community_ban } from "../../../prepare/prepare_random_community_ban";
import { prepare_random_community_community } from "../../../prepare/prepare_random_community_community";
import { prepare_random_community_post } from "../../../prepare/prepare_random_community_post";

/**
 * Test that a banned member cannot create posts in a community.
 *
 * This test validates the business rule that banned members retain view/subscribe
 * privileges but cannot create content. The workflow:
 *
 * 1. Owner registers and creates a community
 * 2. Second member registers who will be banned
 * 3. Owner bans the second member from the community
 * 4. Banned member subscribes to the community (allowed)
 * 5. Banned member attempts to create a post (should fail with ban error)
 */
export async function test_api_post_creation_banned_member_blocked(
  connection: api.IConnection,
): Promise<void> {
  // 1. Owner registers and creates community
  const ownerConnection: api.IConnection = { host: connection.host };
  const owner = await authorize_member_join(ownerConnection, {});
  typia.assert(owner);
  const community = await generate_random_community_member_communities_create(
    ownerConnection,
    {},
  );
  typia.assert(community);
  // 2. Banned member registers
  const bannedConnection: api.IConnection = { host: connection.host };
  const bannedMember = await authorize_member_join(bannedConnection, {});
  typia.assert(bannedMember);
  // 3. Owner bans the member from the community
  const banRecord =
    await generate_random_community_member_communities_bans_create(
      ownerConnection,
      {
        params: { communityName: community.name },
        body: {
          username: bannedMember.username,
          reason: "Violating community guidelines",
        },
      },
    );
  typia.assert(banRecord);
  // Verify ban is properly applied
  TestValidator.equals(
    "banned member matches",
    banRecord.member.username,
    bannedMember.username,
  );
  TestValidator.equals(
    "community matches",
    banRecord.community.name,
    community.name,
  );
  // 4. Banned member subscribes to the community (allowed for banned users)
  const subscription =
    await api.functional.community.member.communities.subscribe(
      bannedConnection,
      { communityName: community.name },
    );
  typia.assert(subscription);
  // 5. Banned member attempts to create a post - should fail
  await TestValidator.error("banned member cannot create post", async () => {
    await api.functional.community.member.communities.posts.create(
      bannedConnection,
      {
        communityName: community.name,
        body: {
          title: RandomGenerator.paragraph({ sentences: 1 }),
          post_type: "TEXT",
          text_content: RandomGenerator.paragraph({ sentences: 5 }),
        } satisfies ICommunityPost.ICreate,
      },
    );
  });
}
