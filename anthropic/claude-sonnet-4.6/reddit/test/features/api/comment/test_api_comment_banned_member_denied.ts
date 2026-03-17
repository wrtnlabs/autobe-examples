import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBan";
import type { ICommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityComment";
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
import { generate_random_community_member_posts_comments_create } from "../../../generate/generate_random_community_member_posts_comments_create";
import { prepare_random_community_ban } from "../../../prepare/prepare_random_community_ban";
import { prepare_random_community_comment } from "../../../prepare/prepare_random_community_comment";
import { prepare_random_community_community } from "../../../prepare/prepare_random_community_community";

export async function test_api_comment_banned_member_denied(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register owner member
  const ownerConnection: api.IConnection = { host: connection.host };
  const owner = await authorize_member_join(ownerConnection, {});
  typia.assert(owner);
  // 2. Register a second member who will be banned
  const bannedMemberConnection: api.IConnection = { host: connection.host };
  const bannedMember = await authorize_member_join(bannedMemberConnection, {});
  typia.assert(bannedMember);
  // 3. Owner creates a community
  const community = await generate_random_community_member_communities_create(
    ownerConnection,
    {},
  );
  typia.assert(community);
  // 4. Owner subscribes to the community (prerequisite for creating posts)
  const subscription =
    await api.functional.community.member.communities.subscriptions.create(
      ownerConnection,
      { communityId: community.id },
    );
  typia.assert(subscription);
  // 5. Owner creates a post in the community
  const post = await api.functional.community.member.communities.posts.create(
    ownerConnection,
    {
      communityId: community.id,
      body: {
        title: RandomGenerator.paragraph({ sentences: 3 }),
        type: "text",
        body: RandomGenerator.paragraph({ sentences: 5 }),
      } satisfies ICommunityPost.ICreate,
    },
  );
  typia.assert(post);
  // 6. Owner bans the second member from the community
  const ban = await generate_random_community_member_communities_bans_create(
    ownerConnection,
    {
      params: { communityId: community.id },
      body: {
        banned_member_id: bannedMember.id,
        reason: "Test ban - violating community rules",
      },
    },
  );
  typia.assert(ban);
  // Verify ban is active
  TestValidator.equals("ban status is active", ban.status, "active");
  TestValidator.equals(
    "banned member id matches",
    ban.bannedMember.id,
    bannedMember.id,
  );
  // 7. Banned member attempts to comment on the post — should get 403
  await TestValidator.httpError(
    "banned member cannot create comment",
    403,
    async () => {
      await generate_random_community_member_posts_comments_create(
        bannedMemberConnection,
        {
          params: { postId: post.id },
          body: {
            content: "Hello from banned user",
          },
        },
      );
    },
  );
}
