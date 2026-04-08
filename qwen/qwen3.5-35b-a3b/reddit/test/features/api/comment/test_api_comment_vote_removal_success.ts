import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformComment";
import type { IRedditPlatformCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommentVote";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import type { IRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPost";
import type { IRedditPlatformPostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPostImage";
import type { IRedditPlatformPostLink } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPostLink";
import type { IRedditPlatformPostText } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPostText";
import type { IRedditPlatformPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPostVote";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_platform_member_comments_create } from "../../../generate/generate_random_reddit_platform_member_comments_create";
import { generate_random_reddit_platform_member_comments_vote_create } from "../../../generate/generate_random_reddit_platform_member_comments_vote_create";
import { prepare_random_reddit_platform_comment } from "../../../prepare/prepare_random_reddit_platform_comment";
import { prepare_random_reddit_platform_comment_vote } from "../../../prepare/prepare_random_reddit_platform_comment_vote";

export async function test_api_comment_vote_removal_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member and authenticate
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username:
        RandomGenerator.alphaNumeric(8) + "_" + RandomGenerator.alphaNumeric(3),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(memberAuth);
  // 2. Create a post with text content
  const post = await api.functional.redditPlatform.member.posts.create(
    memberConnection,
    {
      body: {
        community_id: typia.random<string & tags.Format<"uuid">>(),
        title: RandomGenerator.paragraph({ sentences: 2 }),
        post_type: "text",
        text_content: RandomGenerator.content({ paragraphs: 1 }),
      },
    },
  );
  typia.assert(post);
  // 3. Create a comment on the post
  const comment = await api.functional.redditPlatform.member.comments.create(
    memberConnection,
    {
      body: {
        reddit_platform_post_id: post.id,
        content: RandomGenerator.paragraph({ sentences: 3 }),
      },
    },
  );
  typia.assert(comment);
  // 4. Cast an upvote on the comment to establish vote
  const upvote =
    await api.functional.redditPlatform.member.comments.vote.create(
      memberConnection,
      {
        commentId: comment.id,
        body: { vote_type: "up" },
      },
    );
  typia.assert(upvote);
  TestValidator.equals("upvote vote type", upvote.vote_type, "up");
  // 5. Remove the vote
  await api.functional.redditPlatform.member.comments.vote.erase(
    memberConnection,
    { commentId: comment.id },
  );
  // 6. Verify we can cast a new vote (proves vote was removed)
  const newVote =
    await api.functional.redditPlatform.member.comments.vote.create(
      memberConnection,
      {
        commentId: comment.id,
        body: { vote_type: "down" },
      },
    );
  typia.assert(newVote);
  TestValidator.equals(
    "new vote type after removal",
    newVote.vote_type,
    "down",
  );
  // 7. Remove the downvote and cast upvote again to verify full cycle
  await api.functional.redditPlatform.member.comments.vote.erase(
    memberConnection,
    { commentId: comment.id },
  );
  const anotherUpvote =
    await api.functional.redditPlatform.member.comments.vote.create(
      memberConnection,
      {
        commentId: comment.id,
        body: { vote_type: "up" },
      },
    );
  typia.assert(anotherUpvote);
  TestValidator.equals("final vote type", anotherUpvote.vote_type, "up");
}
