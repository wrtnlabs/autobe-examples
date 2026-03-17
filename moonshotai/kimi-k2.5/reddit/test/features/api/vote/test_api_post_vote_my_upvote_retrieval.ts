import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditLikeAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeAttachment";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import type { IRedditLikeCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunitySubscription";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import type { IRedditLikePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePost";
import type { IRedditLikePostImageContent } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePostImageContent";
import type { IRedditLikePostLinkContent } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePostLinkContent";
import type { IRedditLikePostTextContent } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePostTextContent";
import type { IRedditLikeVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeVote";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_like_member_communities_create } from "../../../generate/generate_random_reddit_like_member_communities_create";
import { generate_random_reddit_like_member_posts_create } from "../../../generate/generate_random_reddit_like_member_posts_create";
import { prepare_random_reddit_like_community } from "../../../prepare/prepare_random_reddit_like_community";
import { prepare_random_reddit_like_post } from "../../../prepare/prepare_random_reddit_like_post";

export async function test_api_post_vote_my_upvote_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create first member (who will create community and upvote)
  const member1Connection: api.IConnection = { host: connection.host };
  const member1 = await authorize_member_join(member1Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: RandomGenerator.name(1),
      password: RandomGenerator.alphaNumeric(16),
    },
  });
  typia.assert(member1);
  // 2. First member creates a community
  const community = await generate_random_reddit_like_member_communities_create(
    member1Connection,
    {
      body: {
        name: RandomGenerator.name(1),
        description: RandomGenerator.paragraph({ sentences: 2 }),
      },
    },
  );
  typia.assert(community);
  // 3. First member subscribes to their own community
  const subscription1 =
    await api.functional.redditLike.member.communities.subscriptions.create(
      member1Connection,
      { communityId: community.id },
    );
  typia.assert(subscription1);
  // 4. Create second member (who will create the post)
  const member2Connection: api.IConnection = { host: connection.host };
  const member2 = await authorize_member_join(member2Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: RandomGenerator.name(1),
      password: RandomGenerator.alphaNumeric(16),
    },
  });
  typia.assert(member2);
  // 5. Second member subscribes to the community
  const subscription2 =
    await api.functional.redditLike.member.communities.subscriptions.create(
      member2Connection,
      { communityId: community.id },
    );
  typia.assert(subscription2);
  // 6. Second member creates a post in the community
  const post = await generate_random_reddit_like_member_posts_create(
    member2Connection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 1 }),
        community_id: community.id,
        post_type: "text",
        body: RandomGenerator.content({ paragraphs: 2 }),
        excerpt: RandomGenerator.paragraph({ sentences: 3 }),
      },
    },
  );
  typia.assert(post);
  // 7. First member upvotes the post created by second member
  const upvote = await api.functional.redditLike.member.posts.my_vote.update(
    member1Connection,
    {
      postId: post.id,
      body: { vote_type: "upvote" },
    },
  );
  typia.assert(upvote);
  // 8. First member retrieves their upvote
  const retrievedVote =
    await api.functional.redditLike.member.posts.my_vote.myVote(
      member1Connection,
      { postId: post.id },
    );
  typia.assert(retrievedVote);
  // 9. Validate the retrieved vote matches the upvote
  TestValidator.equals("vote ID matches", retrievedVote.id, upvote.id);
  TestValidator.equals(
    "vote type is upvote",
    retrievedVote.vote_type,
    "upvote",
  );
  TestValidator.equals(
    "member ID matches",
    retrievedVote.member.id,
    member1.id,
  );
  TestValidator.equals(
    "member email matches",
    retrievedVote.member.email,
    member1.email,
  );
  TestValidator.equals(
    "created_at matches",
    retrievedVote.created_at,
    upvote.created_at,
  );
  TestValidator.equals(
    "updated_at matches",
    retrievedVote.updated_at,
    upvote.updated_at,
  );
}
