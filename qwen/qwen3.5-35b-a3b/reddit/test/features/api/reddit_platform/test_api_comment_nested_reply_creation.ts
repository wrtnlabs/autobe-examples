import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformComment";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunityBan";
import type { IRedditPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunityModerator";
import type { IRedditPlatformCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunitySubscription";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import type { IRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPost";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_platform_member_comments_create } from "../../../generate/generate_random_reddit_platform_member_comments_create";
import { generate_random_reddit_platform_member_communities_create } from "../../../generate/generate_random_reddit_platform_member_communities_create";
import { generate_random_reddit_platform_member_communities_subscribe } from "../../../generate/generate_random_reddit_platform_member_communities_subscribe";
import { generate_random_reddit_platform_member_posts_create } from "../../../generate/generate_random_reddit_platform_member_posts_create";
import { prepare_random_reddit_platform_comment } from "../../../prepare/prepare_random_reddit_platform_comment";
import { prepare_random_reddit_platform_community } from "../../../prepare/prepare_random_reddit_platform_community";
import { prepare_random_reddit_platform_community_subscription } from "../../../prepare/prepare_random_reddit_platform_community_subscription";
import { prepare_random_reddit_platform_member } from "../../../prepare/prepare_random_reddit_platform_member";
import { prepare_random_reddit_platform_post } from "../../../prepare/prepare_random_reddit_platform_post";

export async function test_api_comment_nested_reply_creation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member signup
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: RandomGenerator.alphaNumeric(8),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditPlatformMember.IJoin,
  });
  typia.assert(memberAuth);
  // 2. Create and subscribe to community
  const community =
    await api.functional.redditPlatform.member.communities.create(
      memberConnection,
      {
        body: {
          name: RandomGenerator.alphaNumeric(10),
          description: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IRedditPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);
  const subscription =
    await api.functional.redditPlatform.member.communities.subscribe(
      memberConnection,
      {
        communityId: community.id,
        body: {
          confirmSubscription: true,
        } satisfies IRedditPlatformCommunitySubscription.ICreate,
      },
    );
  typia.assert(subscription);
  // 3. Create post
  const post = await api.functional.redditPlatform.member.posts.create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        postType: "TEXT",
        redditPlatformCommunityId: community.id,
        content: RandomGenerator.paragraph({ sentences: 5 }),
      } satisfies IRedditPlatformPost.ICreate,
    },
  );
  typia.assert(post);
  // 4. Create top-level comment (level 1)
  const comment1 = await api.functional.redditPlatform.member.comments.create(
    memberConnection,
    {
      body: {
        post_id: post.id,
        content: RandomGenerator.paragraph({ sentences: 2 }),
      } satisfies IRedditPlatformComment.ICreate,
    },
  );
  typia.assert(comment1);
  // 5. Create reply to level 1 (level 2)
  const comment2 = await api.functional.redditPlatform.member.comments.create(
    memberConnection,
    {
      body: {
        post_id: post.id,
        parent_id: comment1.id,
        content: RandomGenerator.paragraph({ sentences: 2 }),
      } satisfies IRedditPlatformComment.ICreate,
    },
  );
  typia.assert(comment2);
  // 6. Create nested reply to level 2 (level 3)
  const comment3 = await api.functional.redditPlatform.member.comments.create(
    memberConnection,
    {
      body: {
        post_id: post.id,
        parent_id: comment2.id,
        content: RandomGenerator.paragraph({ sentences: 2 }),
      } satisfies IRedditPlatformComment.ICreate,
    },
  );
  typia.assert(comment3);
  // 7. Create nested reply to level 3 (level 4)
  const comment4 = await api.functional.redditPlatform.member.comments.create(
    memberConnection,
    {
      body: {
        post_id: post.id,
        parent_id: comment3.id,
        content: RandomGenerator.paragraph({ sentences: 2 }),
      } satisfies IRedditPlatformComment.ICreate,
    },
  );
  typia.assert(comment4);
  // 8. Verify all comments
  TestValidator.equals("comment1 post_id", comment1.post_id, post.id);
  TestValidator.equals("comment1 parent_id", comment1.parent_id, null);
  TestValidator.equals("comment1 vote_score", comment1.vote_score, 0);
  TestValidator.equals("comment2 post_id", comment2.post_id, post.id);
  TestValidator.equals("comment2 parent_id", comment2.parent_id, comment1.id);
  TestValidator.equals("comment2 vote_score", comment2.vote_score, 0);
  TestValidator.equals("comment3 post_id", comment3.post_id, post.id);
  TestValidator.equals("comment3 parent_id", comment3.parent_id, comment2.id);
  TestValidator.equals("comment3 vote_score", comment3.vote_score, 0);
  TestValidator.equals("comment4 post_id", comment4.post_id, post.id);
  TestValidator.equals("comment4 parent_id", comment4.parent_id, comment3.id);
  TestValidator.equals("comment4 vote_score", comment4.vote_score, 0);
  // 9. Verify all comments authored by same member
  TestValidator.equals("comment1 author_id", comment1.author_id, memberAuth.id);
  TestValidator.equals("comment2 author_id", comment2.author_id, memberAuth.id);
  TestValidator.equals("comment3 author_id", comment3.author_id, memberAuth.id);
  TestValidator.equals("comment4 author_id", comment4.author_id, memberAuth.id);
}
