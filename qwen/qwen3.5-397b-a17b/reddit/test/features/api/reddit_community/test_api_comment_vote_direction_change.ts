import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityComment";
import type { IRedditCommunityCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommentVote";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityCommunityIcon } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityIcon";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import type { IRedditCommunityPostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPostImage";
import type { IRedditCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunitySubscription";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_community_member_comments_vote } from "../../../generate/generate_random_reddit_community_member_comments_vote";
import { generate_random_reddit_community_member_communities_create } from "../../../generate/generate_random_reddit_community_member_communities_create";
import { generate_random_reddit_community_member_posts_comments_create } from "../../../generate/generate_random_reddit_community_member_posts_comments_create";
import { prepare_random_reddit_community_comment } from "../../../prepare/prepare_random_reddit_community_comment";
import { prepare_random_reddit_community_comment_vote } from "../../../prepare/prepare_random_reddit_community_comment_vote";
import { prepare_random_reddit_community_community } from "../../../prepare/prepare_random_reddit_community_community";

export async function test_api_comment_vote_direction_change(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create voter member account
  const voterConnection: api.IConnection = { host: connection.host };
  const voterAuth = await authorize_member_join(voterConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPassword123!",
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditCommunityMember.IJoin,
  });
  typia.assert(voterAuth);
  // 2. Create comment author member account
  const authorConnection: api.IConnection = { host: connection.host };
  const authorAuth = await authorize_member_join(authorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPassword123!",
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditCommunityMember.IJoin,
  });
  typia.assert(authorAuth);
  // 3. Create community (using author's connection)
  const community =
    await generate_random_reddit_community_member_communities_create(
      authorConnection,
      {
        body: {
          name: RandomGenerator.alphabets(10),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        },
      },
    );
  typia.assert(community);
  // 4. Subscribe voter to the community
  const subscription =
    await api.functional.redditCommunity.member.communities.subscription.create(
      voterConnection,
      {
        communityName: community.name,
      },
    );
  typia.assert(subscription);
  // 5. Create a post in the community (using author's connection)
  const post = await api.functional.redditCommunity.member.posts.create(
    authorConnection,
    {
      body: {
        post_type: "text",
        title: RandomGenerator.paragraph({ sentences: 1 }),
        text_content: RandomGenerator.content({ paragraphs: 2 }),
      } satisfies IRedditCommunityPost.ICreate,
    },
  );
  typia.assert(post);
  // 6. Create a comment on the post (using author's connection)
  const comment =
    await generate_random_reddit_community_member_posts_comments_create(
      authorConnection,
      {
        body: {
          content: RandomGenerator.paragraph({ sentences: 3 }),
        },
        params: {
          postId: post.id,
        },
      },
    );
  typia.assert(comment);
  // 7. Cast initial UPVOTE on the comment (using voter's connection)
  const upvoteResult =
    await generate_random_reddit_community_member_comments_vote(
      voterConnection,
      {
        body: {
          direction: "UPVOTE",
        },
        params: {
          commentId: comment.id,
        },
      },
    );
  typia.assert(upvoteResult);
  TestValidator.equals("initial upvote score", upvoteResult.vote_score, 1);
  // 8. Change vote from UPVOTE to DOWNVOTE
  const downvoteResult =
    await generate_random_reddit_community_member_comments_vote(
      voterConnection,
      {
        body: {
          direction: "DOWNVOTE",
        },
        params: {
          commentId: comment.id,
        },
      },
    );
  typia.assert(downvoteResult);
  TestValidator.equals(
    "vote changed to downvote score",
    downvoteResult.vote_score,
    -1,
  );
  TestValidator.notEquals(
    "vote score changed from upvote",
    upvoteResult.vote_score,
    downvoteResult.vote_score,
  );
  // 9. Change vote back from DOWNVOTE to UPVOTE
  const upvoteAgainResult =
    await generate_random_reddit_community_member_comments_vote(
      voterConnection,
      {
        body: {
          direction: "UPVOTE",
        },
        params: {
          commentId: comment.id,
        },
      },
    );
  typia.assert(upvoteAgainResult);
  TestValidator.equals(
    "vote changed back to upvote score",
    upvoteAgainResult.vote_score,
    1,
  );
  TestValidator.notEquals(
    "vote score changed from downvote",
    downvoteResult.vote_score,
    upvoteAgainResult.vote_score,
  );
  // 10. Remove vote (set direction to null)
  const removeVoteResult =
    await generate_random_reddit_community_member_comments_vote(
      voterConnection,
      {
        body: {
          direction: null,
        },
        params: {
          commentId: comment.id,
        },
      },
    );
  typia.assert(removeVoteResult);
  TestValidator.equals("vote removed score", removeVoteResult.vote_score, 0);
}
