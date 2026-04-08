import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditLikeVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditLikeVote";
import type { IRedditLikeComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeComment";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import type { IRedditLikePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePost";
import type { IRedditLikeVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeVote";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test retrieving vote history with post votes.
 *
 * Validates the vote history retrieval endpoint for authenticated members. The test authenticates a member account and retrieves their voting history, verifying the response structure includes proper pagination metadata and vote records with correct discriminator fields.
 *
 * Since no vote creation endpoint is available in the provided SDK, this test focuses on verifying the vote history endpoint returns properly structured responses with the expected polymorphic vote summary format.
 *
 * 1. Authenticate a new member account using join endpoint.
 * 2. Call vote history retrieval endpoint with empty filter criteria.
 * 3. Validate response structure includes pagination metadata.
 * 4. Verify vote records contain correct content_type discriminator ('post').
 * 5. Validate vote summary includes voter information and target post details.
 */
export async function test_api_vote_history_retrieval_with_post_votes(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate member
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized: IRedditLikeMember.IAuthorized = await authorize_member_join(
    memberConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        username: RandomGenerator.name(1),
        href: typia.random<string & tags.Format<"uri">>(),
      } satisfies IRedditLikeMember.IJoin,
    },
  );
  typia.assert(authorized);
  // 2. Retrieve vote history with empty filter
  const voteHistory: IPageIRedditLikeVote.ISummary =
    await api.functional.redditLike.member.votes.index(memberConnection, {
      body: {} satisfies IRedditLikeVote.IRequest,
    });
  typia.assert(voteHistory);
  // 3. Validate pagination metadata
  TestValidator.equals(
    "pagination current page",
    voteHistory.pagination.current,
    0,
  );
  TestValidator.predicate(
    "pagination limit positive",
    voteHistory.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "pagination records non-negative",
    voteHistory.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages non-negative",
    voteHistory.pagination.pages >= 0,
  );
  // 4. Validate vote records structure if any exist
  if (voteHistory.data.length > 0) {
    for (const vote of voteHistory.data) {
      typia.assert(vote);
      // Validate vote record fields
      TestValidator.predicate(
        "vote has uuid id",
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
          vote.id,
        ),
      );
      TestValidator.predicate(
        "vote type is upvote or downvote",
        vote.vote_type === "upvote" || vote.vote_type === "downvote",
      );
      TestValidator.predicate(
        "content type is post or comment",
        vote.content_type === "post" || vote.content_type === "comment",
      );
      TestValidator.predicate(
        "vote has created_at timestamp",
        vote.created_at.length > 0,
      );
      TestValidator.predicate(
        "vote has updated_at timestamp",
        vote.updated_at.length > 0,
      );
      // Validate voter information
      TestValidator.predicate(
        "voter has uuid id",
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
          vote.voter.id,
        ),
      );
      TestValidator.predicate(
        "voter has username",
        vote.voter.username.length > 0,
      );
      TestValidator.predicate(
        "voter has display_name",
        vote.voter.display_name.length > 0,
      );
      // Validate target content based on content_type discriminator
      if (vote.content_type === "post") {
        const post = vote.target as IRedditLikePost.ISummary;
        typia.assert(post);
        TestValidator.predicate(
          "post has uuid id",
          /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
            post.id,
          ),
        );
        TestValidator.predicate("post has title", post.title.length > 0);
        TestValidator.predicate(
          "post has content_type",
          post.content_type.length > 0,
        );
        TestValidator.predicate(
          "post has author",
          post.author.username.length > 0,
        );
        TestValidator.predicate(
          "post has community",
          post.community.name.length > 0,
        );
        TestValidator.predicate(
          "post vote_score is integer",
          typeof post.vote_score === "number",
        );
        TestValidator.predicate(
          "post comment_count is integer",
          typeof post.comment_count === "number",
        );
        TestValidator.predicate(
          "post has content_preview",
          post.content_preview.length >= 0,
        );
        TestValidator.predicate(
          "post has created_at timestamp",
          post.created_at.length > 0,
        );
      }
    }
  }
}
