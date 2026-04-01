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

export async function test_api_comment_vote_change_direction(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  const auth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditCommunityMember.IJoin,
  });
  typia.assert(auth);
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
  // 4. Create a text post
  const post = await api.functional.redditCommunity.member.posts.create(
    memberConnection,
    {
      body: {
        post_type: "text",
        title: RandomGenerator.paragraph({ sentences: 1 }),
        text_content: RandomGenerator.content({ paragraphs: 2 }),
      },
    },
  );
  typia.assert(post);
  // 5. Create a comment on the post
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
  // 6. Test UPVOTE to DOWNVOTE scenario
  // First cast an UPVOTE
  const upvote =
    await api.functional.redditCommunity.member.comments._vote.update(
      memberConnection,
      {
        commentId: comment.id,
        body: {
          direction: "UPVOTE",
        } satisfies IRedditCommunityCommentVote.IUpdate,
      },
    );
  typia.assert(upvote);
  TestValidator.equals("upvote direction", upvote.direction, "UPVOTE");
  // 7. Change vote from UPVOTE to DOWNVOTE
  const downvoteFromUpvote =
    await api.functional.redditCommunity.member.comments._vote.update(
      memberConnection,
      {
        commentId: comment.id,
        body: {
          direction: "DOWNVOTE",
        } satisfies IRedditCommunityCommentVote.IUpdate,
      },
    );
  typia.assert(downvoteFromUpvote);
  TestValidator.equals(
    "vote changed from upvote to downvote",
    downvoteFromUpvote.direction,
    "DOWNVOTE",
  );
  TestValidator.notEquals(
    "vote record updated",
    upvote.updated_at,
    downvoteFromUpvote.updated_at,
  );
  // 8. Test DOWNVOTE to UPVOTE scenario (reverse)
  // Create a second comment for reverse test
  const comment2 =
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
  typia.assert(comment2);
  // First cast a DOWNVOTE
  const downvote =
    await api.functional.redditCommunity.member.comments._vote.update(
      memberConnection,
      {
        commentId: comment2.id,
        body: {
          direction: "DOWNVOTE",
        } satisfies IRedditCommunityCommentVote.IUpdate,
      },
    );
  typia.assert(downvote);
  TestValidator.equals("downvote direction", downvote.direction, "DOWNVOTE");
  // Change vote from DOWNVOTE to UPVOTE
  const upvoteFromDownvote =
    await api.functional.redditCommunity.member.comments._vote.update(
      memberConnection,
      {
        commentId: comment2.id,
        body: {
          direction: "UPVOTE",
        } satisfies IRedditCommunityCommentVote.IUpdate,
      },
    );
  typia.assert(upvoteFromDownvote);
  TestValidator.equals(
    "vote changed from downvote to upvote",
    upvoteFromDownvote.direction,
    "UPVOTE",
  );
  TestValidator.notEquals(
    "vote record updated in reverse",
    downvote.updated_at,
    upvoteFromDownvote.updated_at,
  );
}
