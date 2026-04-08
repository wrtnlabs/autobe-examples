import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditLikeComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditLikeComment";
import type { IRedditLikeComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeComment";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_comment_retrieval_with_best_sorting(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new member account
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditLikeMember.IJoin,
  });
  typia.assert(member);
  // 2. Generate a random postId (assuming test data exists)
  const postId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 3. Retrieve comments with best sorting
  const limit: number &
    tags.Type<"int32"> &
    tags.Minimum<1> &
    tags.Maximum<100> = typia.random<
    number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
  >();
  const result = await api.functional.redditLike.member.posts.comments.index(
    memberConnection,
    {
      postId,
      body: {
        sort: "best",
        limit,
      } satisfies IRedditLikeComment.IRequest,
    },
  );
  typia.assert(result);
  // 4. Validate pagination metadata
  TestValidator.predicate(
    "pagination has current page",
    result.pagination.current >= 0,
  );
  TestValidator.predicate("pagination has limit", result.pagination.limit >= 0);
  TestValidator.predicate(
    "pagination has records",
    result.pagination.records >= 0,
  );
  TestValidator.predicate("pagination has pages", result.pagination.pages >= 0);
  TestValidator.equals(
    "pages matches calculation",
    result.pagination.pages,
    Math.ceil(result.pagination.records / (result.pagination.limit || 1)),
  );
  // 5. Validate comment structure and sorting
  if (result.data.length > 0) {
    // Verify all comments have required fields
    for (const comment of result.data) {
      typia.assert(comment);
      TestValidator.predicate("comment has valid id", comment.id !== undefined);
      TestValidator.predicate(
        "comment has author",
        comment.author !== undefined,
      );
      TestValidator.predicate(
        "comment has content",
        comment.content !== undefined,
      );
      TestValidator.predicate(
        "comment has vote_score",
        comment.vote_score !== undefined,
      );
      TestValidator.predicate(
        "comment has created_at",
        comment.created_at !== undefined,
      );
      TestValidator.predicate(
        "comment has updated_at",
        comment.updated_at !== undefined,
      );
      TestValidator.predicate(
        "comment has deleted_at",
        comment.deleted_at !== undefined,
      );
      TestValidator.predicate(
        "comment has replies array",
        Array.isArray(comment.replies),
      );
      // Verify author has required fields
      TestValidator.predicate(
        "author has valid id",
        comment.author.id !== undefined,
      );
      TestValidator.predicate(
        "author has username",
        comment.author.username !== undefined,
      );
      TestValidator.predicate(
        "author has display_name",
        comment.author.display_name !== undefined,
      );
      TestValidator.predicate(
        "author has karma_score",
        comment.author.karma_score !== undefined,
      );
    }
    // Verify comments are sorted by vote_score in descending order
    for (let i = 0; i < result.data.length - 1; i++) {
      TestValidator.predicate(
        `comment ${i} vote_score >= comment ${i + 1} vote_score`,
        result.data[i].vote_score >= result.data[i + 1].vote_score,
      );
    }
    // Verify nested replies are also sorted by vote_score
    for (const comment of result.data) {
      if (comment.replies.length > 0) {
        for (let i = 0; i < comment.replies.length - 1; i++) {
          TestValidator.predicate(
            `reply ${i} vote_score >= reply ${i + 1} vote_score`,
            comment.replies[i].vote_score >= comment.replies[i + 1].vote_score,
          );
        }
      }
    }
  }
}
