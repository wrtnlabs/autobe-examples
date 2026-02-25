import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityComment";
import type { ICommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityCommunity";
import type { ICommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityMember";
import type { ICommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPost";
import type { ICommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunitySubscription";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityComment";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_community_member_communities_create } from "../../../generate/generate_random_community_member_communities_create";
import { generate_random_community_member_communities_posts_create } from "../../../generate/generate_random_community_member_communities_posts_create";
import { generate_random_community_member_posts_comments_create } from "../../../generate/generate_random_community_member_posts_comments_create";
import { prepare_random_community_comment } from "../../../prepare/prepare_random_community_comment";
import { prepare_random_community_community } from "../../../prepare/prepare_random_community_community";
import { prepare_random_community_post } from "../../../prepare/prepare_random_community_post";

/**
 * Test retrieving a member's comment history with default pagination and sorting.
 *
 * This test validates that:
 * - Comments are sorted by 'best' (highest vote_score) by default
 * - Pagination defaults to page 1, limit 25
 * - Response includes proper pagination metadata
 * - Each comment includes truncated content, author summary, and post summary
 */
export async function test_api_member_comments_list_default_sorting(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account (author)
  const authorConnection: api.IConnection = { host: connection.host };
  const author = await authorize_member_join(authorConnection, {});
  typia.assert(author);
  // 2. Create a community (creator is auto-subscribed)
  const community = await generate_random_community_member_communities_create(
    authorConnection,
    {},
  );
  typia.assert(community);
  // 3. Create a post in the community
  const post = await generate_random_community_member_communities_posts_create(
    authorConnection,
    {
      params: { communityName: community.name },
    },
  );
  typia.assert(post);
  // 4. Create multiple comments by this member
  const comments = await ArrayUtil.asyncRepeat(3, async () => {
    return await generate_random_community_member_posts_comments_create(
      authorConnection,
      {
        params: { postId: post.id },
      },
    );
  });
  // 5. Call PATCH /community/members/{memberId}/comments with default parameters
  const response = await api.functional.community.members.comments.index(
    connection,
    {
      memberId: author.id,
      body: {},
    },
  );
  typia.assert(response);
  // Validate pagination defaults
  TestValidator.equals("default page is 1", response.pagination.current, 1);
  TestValidator.equals("default limit is 25", response.pagination.limit, 25);
  TestValidator.predicate("total records > 0", response.pagination.records > 0);
  TestValidator.predicate("total pages >= 1", response.pagination.pages >= 1);
  // Validate comments are returned
  TestValidator.predicate("data has comments", response.data.length > 0);
  // Validate each comment has required fields
  for (const comment of response.data) {
    TestValidator.predicate("comment has id", comment.id !== undefined);
    TestValidator.predicate(
      "content is truncated to 200 chars",
      comment.content.length <= 200,
    );
    TestValidator.predicate(
      "vote_score is number",
      typeof comment.vote_score === "number",
    );
    TestValidator.predicate(
      "upvote_count is number",
      typeof comment.upvote_count === "number",
    );
    TestValidator.predicate(
      "downvote_count is number",
      typeof comment.downvote_count === "number",
    );
    TestValidator.predicate(
      "created_at is date-time",
      comment.created_at !== undefined,
    );
    TestValidator.predicate(
      "edited_at is null or date-time",
      comment.edited_at === null || comment.edited_at !== undefined,
    );
    // Validate author summary
    TestValidator.predicate("author has id", comment.author.id !== undefined);
    TestValidator.predicate(
      "author has username",
      comment.author.username !== undefined,
    );
    TestValidator.predicate(
      "author has displayName (can be null)",
      comment.author.displayName === null ||
        comment.author.displayName !== undefined,
    );
    TestValidator.predicate(
      "author has karma",
      comment.author.karma !== undefined,
    );
    TestValidator.predicate(
      "author has createdAt",
      comment.author.createdAt !== undefined,
    );
    // Validate post summary
    TestValidator.predicate("post has id", comment.post.id !== undefined);
    TestValidator.predicate("post has title", comment.post.title !== undefined);
  }
  // Validate default sorting by 'best' (highest vote_score first)
  // When vote_scores are equal, older comments appear first (created_at ASC)
  for (let i = 0; i < response.data.length - 1; i++) {
    const current = response.data[i];
    const next = response.data[i + 1];
    TestValidator.predicate(
      "comments sorted by vote_score DESC (best sorting)",
      current.vote_score >= next.vote_score,
    );
  }
}
