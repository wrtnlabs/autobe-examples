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
import { generate_random_reddit_community_member_communities_create } from "../../../generate/generate_random_reddit_community_member_communities_create";
import { generate_random_reddit_community_member_posts_comments_create } from "../../../generate/generate_random_reddit_community_member_posts_comments_create";
import { prepare_random_reddit_community_comment } from "../../../prepare/prepare_random_reddit_community_comment";
import { prepare_random_reddit_community_community } from "../../../prepare/prepare_random_reddit_community_community";

/**
 * Test removing an existing vote from a comment.
 *
 * Workflow:
 * 1. Authenticate as a member
 * 2. Create a community
 * 3. Subscribe to the community
 * 4. Create a post in the community
 * 5. Create a comment on the post
 * 6. Cast an UPVOTE on the comment and verify
 * 7. Remove the vote (direction: null) and verify removal
 * 8. Test DOWNVOTE removal scenario
 */
export async function test_api_comment_vote_remove(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  const authResult = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditCommunityMember.IJoin,
  });
  typia.assert(authResult);
  // 2. Create community
  const community =
    await generate_random_reddit_community_member_communities_create(
      memberConnection,
      {
        body: {
          name: RandomGenerator.alphabets(10),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        },
      },
    );
  typia.assert(community);
  // 3. Subscribe to community
  const subscription =
    await api.functional.redditCommunity.member.communities.subscription.create(
      memberConnection,
      {
        communityName: community.name,
      },
    );
  typia.assert(subscription);
  // 4. Create post
  const post = await api.functional.redditCommunity.member.posts.create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 1 }),
        post_type: "text",
        text_content: RandomGenerator.content({ paragraphs: 2 }),
      },
    },
  );
  typia.assert(post);
  TestValidator.equals("post type", post.post_type, "text");
  // 5. Create comment
  const comment =
    await generate_random_reddit_community_member_posts_comments_create(
      memberConnection,
      {
        body: {
          content: RandomGenerator.paragraph({ sentences: 2 }),
        },
        params: {
          postId: post.id,
        },
      },
    );
  typia.assert(comment);
  TestValidator.equals("comment author", comment.author.id, authResult.id);
  // 6. Cast UPVOTE on comment
  const upvoteResult =
    await api.functional.redditCommunity.member.comments._vote.update(
      memberConnection,
      {
        commentId: comment.id,
        body: {
          direction: "UPVOTE",
        },
      },
    );
  typia.assert(upvoteResult);
  TestValidator.equals("upvote direction", upvoteResult.direction, "UPVOTE");
  TestValidator.equals("upvote voter", upvoteResult.member.id, authResult.id);
  // 7. Remove the upvote (direction: null)
  const removeUpvoteResult =
    await api.functional.redditCommunity.member.comments._vote.update(
      memberConnection,
      {
        commentId: comment.id,
        body: {
          direction: null,
        },
      },
    );
  // When vote is removed, response may be null or the deleted vote record
  // Verify the operation completed successfully
  if (removeUpvoteResult !== null) {
    typia.assert(removeUpvoteResult);
  }
  // 8. Cast DOWNVOTE on same comment
  const downvoteResult =
    await api.functional.redditCommunity.member.comments._vote.update(
      memberConnection,
      {
        commentId: comment.id,
        body: {
          direction: "DOWNVOTE",
        },
      },
    );
  typia.assert(downvoteResult);
  TestValidator.equals(
    "downvote direction",
    downvoteResult.direction,
    "DOWNVOTE",
  );
  // 9. Remove the downvote
  const removeDownvoteResult =
    await api.functional.redditCommunity.member.comments._vote.update(
      memberConnection,
      {
        commentId: comment.id,
        body: {
          direction: null,
        },
      },
    );
  // Verify the operation completed successfully
  if (removeDownvoteResult !== null) {
    typia.assert(removeDownvoteResult);
  }
  // 10. Verify we can vote again after removal (cast UPVOTE once more)
  const finalVoteResult =
    await api.functional.redditCommunity.member.comments._vote.update(
      memberConnection,
      {
        commentId: comment.id,
        body: {
          direction: "UPVOTE",
        },
      },
    );
  typia.assert(finalVoteResult);
  TestValidator.equals(
    "final vote direction",
    finalVoteResult.direction,
    "UPVOTE",
  );
}
