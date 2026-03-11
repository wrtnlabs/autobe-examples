import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformComment";
import type { IRedditPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformComment";
import type { IRedditPlatformCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommentVote";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import type { IRedditPlatformMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMemberSession";
import type { IRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPost";
import type { IRedditPlatformPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPostVote";
import type { IRedditPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformReport";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_platform_member_comments_vote_create } from "../../../generate/generate_random_reddit_platform_member_comments_vote_create";
import { prepare_random_reddit_platform_comment_vote } from "../../../prepare/prepare_random_reddit_platform_comment_vote";

export async function test_api_comments_listing_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create authenticated member
  const memberConnection: api.IConnection = { host: connection.host };
  const member: IRedditPlatformMember.IAuthorized = await authorize_member_join(
    memberConnection,
    {
      body: typia.random<IRedditPlatformMember.IJoin>(),
    },
  );
  typia.assert(member);
  // 2. Create multiple comments on an existing post
  const postId = typia.random<string & tags.Format<"uuid">>();
  const comments: IRedditPlatformComment[] = [];
  for (let i = 0; i < 5; i++) {
    const commentBody = {
      post_id: postId,
      parent_id: i >= 3 ? comments[2]?.id : undefined,
      content: RandomGenerator.paragraph({ sentences: 3 }),
    } satisfies IRedditPlatformComment.ICreate;
    const comment = await api.functional.redditPlatform.member.comments.create(
      memberConnection,
      {
        body: commentBody,
      },
    );
    typia.assert(comment);
    comments.push(comment);
  }
  // 3. Create additional members and cast votes
  const voters: {
    member: IRedditPlatformMember.IAuthorized;
    connection: api.IConnection;
  }[] = [];
  for (let i = 0; i < 3; i++) {
    const voterConnection: api.IConnection = { host: connection.host };
    const voter = await authorize_member_join(voterConnection, {
      body: typia.random<IRedditPlatformMember.IJoin>(),
    });
    typia.assert(voter);
    voters.push({ member: voter, connection: voterConnection });
  }
  // 4. Cast votes on comments from different members
  await ArrayUtil.asyncForEach(voters, async ({ connection }) => {
    for (let i = 0; i < comments.length; i++) {
      const voteBody = {
        vote_type:
          i % 3 === 0
            ? ("UPVOTE" as const)
            : i % 3 === 1
              ? ("DOWNVOTE" as const)
              : null,
      } satisfies IRedditPlatformCommentVote.ICreate;
      await api.functional.redditPlatform.member.comments.vote.create(
        connection,
        {
          commentId: comments[i].id,
          body: voteBody,
        },
      );
    }
  });
  // 5. List comments on the post
  const commentsList = await api.functional.redditPlatform.posts.comments.index(
    connection,
    {
      postId: postId,
      body: {
        sortBy: "new",
        page: 1,
        limit: 10,
      } satisfies IRedditPlatformComment.IRequest,
    },
  );
  typia.assert(commentsList);
  // 6. Validate response
  TestValidator.equals(
    "comments count",
    commentsList.data.length,
    comments.length,
  );
  TestValidator.equals(
    "pagination current",
    commentsList.pagination.current,
    1,
  );
  TestValidator.equals("pagination limit", commentsList.pagination.limit, 10);
  TestValidator.equals(
    "pagination records",
    commentsList.pagination.records,
    comments.length,
  );
  TestValidator.equals("pagination pages", commentsList.pagination.pages, 1);
  // Validate sorting (newest first)
  for (let i = 0; i < commentsList.data.length - 1; i++) {
    const current = commentsList.data[i];
    const next = commentsList.data[i + 1];
    TestValidator.predicate(
      `comment ${i} is newer than comment ${i + 1}`,
      new Date(current.created_at) >= new Date(next.created_at),
    );
  }
  // Validate each comment has required fields
  for (const comment of commentsList.data) {
    typia.assert(comment!);
    TestValidator.predicate("comment has content", comment.content.length > 0);
    TestValidator.predicate("comment has author", comment.author !== null);
    TestValidator.predicate(
      "author has username",
      comment.author.username.length > 0,
    );
    TestValidator.predicate(
      "author has display_name",
      comment.author.display_name.length > 0,
    );
    TestValidator.predicate(
      "comment has vote_score",
      typeof comment.vote_score === "number",
    );
    TestValidator.predicate(
      "comment has timestamps",
      comment.created_at !== undefined,
    );
  }
}
