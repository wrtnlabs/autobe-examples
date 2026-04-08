import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditLikeVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditLikeVote";
import type { IRedditLikeComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeComment";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import type { IRedditLikePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePost";
import type { IRedditLikePostFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePostFile";
import type { IRedditLikeVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeVote";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_like_member_posts_comments_create } from "../../../generate/generate_random_reddit_like_member_posts_comments_create";
import { generate_random_reddit_like_member_posts_create } from "../../../generate/generate_random_reddit_like_member_posts_create";
import { prepare_random_reddit_like_comment } from "../../../prepare/prepare_random_reddit_like_comment";
import { prepare_random_reddit_like_post } from "../../../prepare/prepare_random_reddit_like_post";

/**
 * Test retrieving votes list for a comment with no votes.
 *
 * Validates the edge case where a comment exists but has received zero votes. Ensures the API returns an empty data array with correct pagination metadata instead of errors or null values.
 *
 * The test follows this workflow:
 * 1. Create a member account with randomized credentials
 * 2. Create a post in a community (using random community_id)
 * 3. Create a comment on the post without any votes being cast
 * 4. Retrieve the votes list for the comment
 * 5. Validate empty results and pagination metadata
 *
 * Expected outcomes:
 * - Response status 200 (success)
 * - data array is empty (length 0)
 * - pagination.records equals 0
 * - pagination.pages equals 0
 * - pagination.current equals 1
 * - pagination.limit is a positive number
 */
export async function test_api_comment_votes_list_empty(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account
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
  // 2. Create a post (need community_id - using random UUID as placeholder)
  const post = await generate_random_reddit_like_member_posts_create(
    memberConnection,
    {
      body: {
        community_id: typia.random<string & tags.Format<"uuid">>(),
        title: RandomGenerator.paragraph({ sentences: 2 }),
        content_type: "text",
        content_text: RandomGenerator.paragraph({ sentences: 5 }),
      } satisfies IRedditLikePost.ICreate,
    },
  );
  typia.assert(post);
  // 3. Create a comment on the post (no votes will be cast)
  const comment =
    await generate_random_reddit_like_member_posts_comments_create(
      memberConnection,
      {
        body: {
          content: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IRedditLikeComment.ICreate,
        params: {
          postId: post.id,
        },
      },
    );
  typia.assert(comment);
  // 4. Retrieve votes list for the comment (should be empty)
  const votesList: IPageIRedditLikeVote.ISummary =
    await api.functional.redditLike.member.comments.votes.list(
      memberConnection,
      {
        commentId: comment.id,
      },
    );
  typia.assert(votesList);
  // 5. Validate empty results
  TestValidator.equals("votes data array is empty", votesList.data.length, 0);
  TestValidator.equals(
    "pagination records is 0",
    votesList.pagination.records,
    0,
  );
  TestValidator.equals("pagination pages is 0", votesList.pagination.pages, 0);
  TestValidator.predicate(
    "pagination current is positive",
    votesList.pagination.current > 0,
  );
  TestValidator.predicate(
    "pagination limit is positive",
    votesList.pagination.limit > 0,
  );
}
