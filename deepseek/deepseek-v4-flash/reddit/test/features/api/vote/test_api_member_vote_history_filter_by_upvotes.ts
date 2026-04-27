import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommentVote";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityImage } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityImage";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProfile";
import type { ICommunityPlatformSubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSubscription";
import type { ICommunityPlatformVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformVote";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformVote";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_community_platform_member_communities_create } from "../../../generate/generate_random_community_platform_member_communities_create";
import { generate_random_community_platform_member_communities_subscribers_create } from "../../../generate/generate_random_community_platform_member_communities_subscribers_create";
import { generate_random_community_platform_member_posts_comments_create } from "../../../generate/generate_random_community_platform_member_posts_comments_create";
import { generate_random_community_platform_member_posts_comments_votes_create } from "../../../generate/generate_random_community_platform_member_posts_comments_votes_create";
import { generate_random_community_platform_member_posts_create } from "../../../generate/generate_random_community_platform_member_posts_create";
import { generate_random_community_platform_member_votes_create } from "../../../generate/generate_random_community_platform_member_votes_create";
import { prepare_random_community_platform_comment } from "../../../prepare/prepare_random_community_platform_comment";
import { prepare_random_community_platform_comment_vote } from "../../../prepare/prepare_random_community_platform_comment_vote";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_community_image } from "../../../prepare/prepare_random_community_platform_community_image";
import { prepare_random_community_platform_post } from "../../../prepare/prepare_random_community_platform_post";
import { prepare_random_community_platform_subscription } from "../../../prepare/prepare_random_community_platform_subscription";
import { prepare_random_community_platform_vote } from "../../../prepare/prepare_random_community_platform_vote";

/**
 * Test that a member can filter their voting history to see only upvotes.
 *
 * Validates the PATCH /communityPlatform/member/votes endpoint's value filter by creating mixed voting data (upvote on a post, downvote on a comment) and then querying with `{ value: 1 }`. Ensures the response contains only upvote records with correct pagination metadata and complete vote summary structure.
 *
 * A separate author member provides the content to vote on, avoiding self-voting prohibition. The voter member casts both an upvote and a downvote, then filters for upvotes only.
 *
 * 1. Member A (author) registers, creates a community, subscribes, creates a post and a comment.
 * 2. Member B (voter) registers, casts an upvote (+1) on Member A's post, and casts a downvote (-1) on Member A's comment.
 * 3. Member B queries vote history with `{ value: 1 }` filter.
 * 4. Validates all returned records are upvotes with valid pagination metadata.
 */
export async function test_api_member_vote_history_filter_by_upvotes(
  connection: api.IConnection,
): Promise<void> {
  // ---- Member A (author) setup ----
  const authorConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(authorConnection, {});
  // Create a community
  const community =
    await generate_random_community_platform_member_communities_create(
      authorConnection,
      {},
    );
  // Subscribe to the community
  await generate_random_community_platform_member_communities_subscribers_create(
    authorConnection,
    {
      params: { communityId: community.id },
    },
  );
  // Create a text post in the community
  const post = await generate_random_community_platform_member_posts_create(
    authorConnection,
    {
      body: {
        communityId: community.id,
      },
    },
  );
  // Create a comment on the post
  const comment =
    await generate_random_community_platform_member_posts_comments_create(
      authorConnection,
      {
        params: { postId: post.id },
      },
    );
  // ---- Member B (voter) setup ----
  const voterConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(voterConnection, {});
  // Cast an upvote (+1) on the post
  const upvote = await generate_random_community_platform_member_votes_create(
    voterConnection,
    {
      body: {
        target_type: "post",
        target_id: post.id,
        value: 1,
      },
    },
  );
  typia.assert(upvote);
  // Cast a downvote (-1) on the comment
  const downvote =
    await generate_random_community_platform_member_posts_comments_votes_create(
      voterConnection,
      {
        params: {
          postId: post.id,
          commentId: comment.id,
        },
        body: {
          value: -1,
        },
      },
    );
  typia.assert(downvote);
  // ---- Query voting history filtered by upvotes ----
  const result = await api.functional.communityPlatform.member.votes.index(
    voterConnection,
    {
      body: {
        value: 1,
      },
    },
  );
  typia.assert(result);
  // ---- Validations ----
  // All returned records must be upvotes (value === 1)
  TestValidator.predicate("all returned votes have value === 1", () =>
    result.data.every((v) => v.value === 1),
  );
  // At least one upvote record should be present
  TestValidator.predicate(
    "at least one upvote returned",
    () => result.data.length >= 1,
  );
  // Pagination metadata must be valid
  TestValidator.predicate(
    "pagination metadata present and valid",
    () =>
      result.pagination.current >= 1 &&
      result.pagination.limit >= 1 &&
      result.pagination.records >= 1 &&
      result.pagination.pages >= 1,
  );
}
