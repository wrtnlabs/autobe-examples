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
import { generate_random_reddit_like_member_posts_votes_create } from "../../../generate/generate_random_reddit_like_member_posts_votes_create";
import { prepare_random_reddit_like_community } from "../../../prepare/prepare_random_reddit_like_community";
import { prepare_random_reddit_like_post } from "../../../prepare/prepare_random_reddit_like_post";
import { prepare_random_reddit_like_vote } from "../../../prepare/prepare_random_reddit_like_vote";

export async function test_api_post_vote_change_upvote_to_downvote(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as memberA (post author)
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberAEmail = typia.random<string & tags.Format<"email">>();
  const memberA = await authorize_member_join(memberAConnection, {
    body: {
      email: memberAEmail,
      password: RandomGenerator.alphabets(16),
      username: RandomGenerator.name(),
    } satisfies IRedditLikeMember.IJoin,
  });
  typia.assert(memberA);
  // 2. Create a community as memberA
  const community = await generate_random_reddit_like_member_communities_create(
    memberAConnection,
    {},
  );
  typia.assert(community);
  // 3. Subscribe to community as memberA
  await api.functional.redditLike.member.communities.subscriptions.create(
    memberAConnection,
    { communityId: community.id },
  );
  // 4. Create a post as memberA
  const post = await generate_random_reddit_like_member_posts_create(
    memberAConnection,
    {
      body: {
        community_id: community.id,
        title: RandomGenerator.paragraph({ sentences: 2 }),
        body: RandomGenerator.content({ paragraphs: 2 }),
      },
    },
  );
  typia.assert(post);
  // 5. Authenticate as memberB (voter)
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberB = await authorize_member_join(memberBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphabets(16),
      username: RandomGenerator.name(),
    } satisfies IRedditLikeMember.IJoin,
  });
  typia.assert(memberB);
  // 6. Cast upvote on the post as memberB
  const upvote = await generate_random_reddit_like_member_posts_votes_create(
    memberBConnection,
    {
      body: {
        vote_type: "upvote",
      } satisfies IRedditLikeVote.ICreate,
      params: {
        postId: post.id,
      },
    },
  );
  typia.assert(upvote);
  TestValidator.equals("upvote type is correct", upvote.vote_type, "upvote");
  // 7. Change vote to downvote as memberB (should update existing vote)
  const downvote = await generate_random_reddit_like_member_posts_votes_create(
    memberBConnection,
    {
      body: {
        vote_type: "downvote",
      } satisfies IRedditLikeVote.ICreate,
      params: {
        postId: post.id,
      },
    },
  );
  typia.assert(downvote);
  TestValidator.equals(
    "downvote type is correct",
    downvote.vote_type,
    "downvote",
  );
  // 8. Validate vote changed correctly
  TestValidator.notEquals(
    "vote type changed from upvote",
    upvote.vote_type,
    downvote.vote_type,
  );
}
