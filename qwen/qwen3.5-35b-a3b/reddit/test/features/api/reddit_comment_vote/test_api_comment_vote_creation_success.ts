import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityComment";
import type { IRedditCommunityCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommentVote";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import type { IRedditCommunityPostFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPostFile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_community_member_posts_comments_create } from "../../../generate/generate_random_reddit_community_member_posts_comments_create";
import { generate_random_reddit_community_member_posts_comments_votes_create } from "../../../generate/generate_random_reddit_community_member_posts_comments_votes_create";
import { generate_random_reddit_community_member_posts_create } from "../../../generate/generate_random_reddit_community_member_posts_create";
import { prepare_random_reddit_community_comment } from "../../../prepare/prepare_random_reddit_community_comment";
import { prepare_random_reddit_community_comment_vote } from "../../../prepare/prepare_random_reddit_community_comment_vote";
import { prepare_random_reddit_community_post } from "../../../prepare/prepare_random_reddit_community_post";
import { prepare_random_reddit_community_post_file } from "../../../prepare/prepare_random_reddit_community_post_file";

export async function test_api_comment_vote_creation_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Join Member A (post creator)
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberA = await authorize_member_join(memberAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(memberA);
  // 2. Join Member B (comment author)
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberB = await authorize_member_join(memberBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(memberB);
  // 3. Join Member C (voter - different from comment author)
  const memberCConnection: api.IConnection = { host: connection.host };
  const memberC = await authorize_member_join(memberCConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(memberC);
  // 4. Member A creates a post in a community
  const post = await generate_random_reddit_community_member_posts_create(
    memberAConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        post_type: "text",
        reddit_community_community_id: typia.random<
          string & tags.Format<"uuid">
        >(),
        text_content: RandomGenerator.paragraph({
          sentences: 5,
          wordMin: 10,
          wordMax: 20,
        }),
      },
    },
  );
  typia.assert(post);
  // 5. Member B creates a comment on the post
  const comment =
    await generate_random_reddit_community_member_posts_comments_create(
      memberBConnection,
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
  // 6. Member C casts a vote on the comment
  const vote =
    await generate_random_reddit_community_member_posts_comments_votes_create(
      memberCConnection,
      {
        body: {
          vote_type: RandomGenerator.pick(["upvote", "downvote"]),
        },
        params: {
          postId: post.id,
          commentId: comment.id,
        },
      },
    );
  typia.assert(vote);
  // 7. Validate vote record id is a valid UUID
  TestValidator.predicate("vote id is UUID", () => {
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidRegex.test(vote.id);
  });
  // 8. Validate vote type is valid enum value
  TestValidator.predicate("vote type is upvote or downvote", () => {
    return vote.vote_type === "upvote" || vote.vote_type === "downvote";
  });
  // 9. Validate vote author exists
  TestValidator.predicate("vote author exists", () => vote.author !== null);
  TestValidator.notEquals(
    "vote author is not undefined",
    vote.author,
    undefined,
  );
  // 10. Validate vote comment exists
  TestValidator.predicate("vote comment exists", () => vote.comment !== null);
  TestValidator.notEquals(
    "vote comment is not undefined",
    vote.comment,
    undefined,
  );
  // 11. Validate vote author matches voting member (Member C)
  TestValidator.equals(
    "vote author id matches voter",
    vote.author.id,
    memberC.id,
  );
  TestValidator.equals(
    "vote author username matches",
    vote.author.username,
    memberC.username,
  );
  // 12. Validate vote comment reference matches target comment
  TestValidator.equals(
    "vote comment id matches target",
    vote.comment.id,
    comment.id,
  );
  TestValidator.equals(
    "vote comment content matches",
    vote.comment.content,
    comment.content,
  );
  // 13. Validate created_at is valid datetime format
  TestValidator.predicate("created_at is valid datetime", () => {
    const dt = new Date(vote.created_at);
    return !isNaN(dt.getTime());
  });
  // 14. Validate updated_at is valid datetime format
  TestValidator.predicate("updated_at is valid datetime", () => {
    const dt = new Date(vote.updated_at);
    return !isNaN(dt.getTime());
  });
  // 15. Validate deleted_at is null (active vote)
  TestValidator.equals("vote deleted_at is null", vote.deleted_at, null);
  // 16. Validate comment votes_count increased after vote
  TestValidator.predicate("comment has votes_count >= 1", () => {
    return comment.votes_count >= 1;
  });
  // 17. Validate comment author is not the voter (self-vote forbidden rule)
  TestValidator.notEquals(
    "vote author is not comment author",
    vote.author.id,
    comment.author.id,
  );
}
