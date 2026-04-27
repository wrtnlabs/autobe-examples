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
 * Test that an authenticated member can view their complete voting history
 * with mixed upvotes and downvotes on both posts and comments.
 *
 * Validates the complete flow of casting votes on different content types
 * and then retrieving the full history. Ensures the paginated response
 * correctly returns all vote records with proper polymorphic target
 * references (post vs comment) and vote values (+1 for upvote, -1 for
 * downvote).
 *
 * 1. Register a member account and obtain JWT authentication.
 * 2. Create a community with a unique name and icon.
 * 3. Subscribe the member to the community.
 * 4. Create a text-type post in the community.
 * 5. Create a top-level comment on the post.
 * 6. Cast an upvote (+1) on the post.
 * 7. Cast a downvote (-1) on the comment.
 * 8. Retrieve the member's full voting history with no filters.
 * 9. Validate pagination metadata (current, limit, records, pages).
 * 10. Validate exactly 2 vote records exist in the response data.
 * 11. Validate one record is a post upvote (target_type="post", value=1).
 * 12. Validate one record is a comment downvote (target_type="comment", value=-1).
 * 13. Validate each record has: id, voter, target_type, target_id, value,
 *     created_at, updated_at.
 */
export async function test_api_member_vote_history_list_with_mixed_votes(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a member
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {});
  typia.assert(authorized);
  // 2. Create a community
  const community =
    await generate_random_community_platform_member_communities_create(
      memberConnection,
      {},
    );
  typia.assert(community);
  // 3. Subscribe to the community
  const subscription =
    await generate_random_community_platform_member_communities_subscribers_create(
      memberConnection,
      {
        params: { communityId: community.id },
      },
    );
  typia.assert(subscription);
  // 4. Create a text post in the community
  const post = await generate_random_community_platform_member_posts_create(
    memberConnection,
    {
      body: {
        communityId: community.id,
        type: "text",
        title: RandomGenerator.paragraph({ sentences: 1 }),
        body: RandomGenerator.paragraph({ sentences: 5 }),
      },
    },
  );
  typia.assert(post);
  // 5. Create a comment on the post
  const comment =
    await generate_random_community_platform_member_posts_comments_create(
      memberConnection,
      {
        params: { postId: post.id },
        body: {
          content: RandomGenerator.paragraph({ sentences: 3 }),
        },
      },
    );
  typia.assert(comment);
  // 6. Cast an upvote (+1) on the post
  const postVote = await generate_random_community_platform_member_votes_create(
    memberConnection,
    {
      body: {
        target_type: "post",
        target_id: post.id,
        value: 1,
      },
    },
  );
  typia.assert(postVote);
  // 7. Cast a downvote (-1) on the comment
  const commentVote =
    await generate_random_community_platform_member_posts_comments_votes_create(
      memberConnection,
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
  typia.assert(commentVote);
  // 8. Retrieve the member's full voting history with no filters
  const votePage = await api.functional.communityPlatform.member.votes.index(
    memberConnection,
    {
      body: {},
    },
  );
  typia.assert(votePage);
  // 9. Validate pagination metadata
  TestValidator.predicate(
    "pagination has valid current page",
    () => votePage.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination has valid limit",
    () => votePage.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "pagination has correct record count",
    () => votePage.pagination.records === 2,
  );
  TestValidator.predicate(
    "pagination has at least 1 page",
    () => votePage.pagination.pages >= 1,
  );
  // 10. Validate exactly 2 vote records
  TestValidator.equals("vote records count", votePage.data.length, 2);
  // 11-12. Validate one post upvote and one comment downvote
  const postVotes = votePage.data.filter(
    (v) => v.target_type === "post" && v.value === 1,
  );
  const commentVotes = votePage.data.filter(
    (v) => v.target_type === "comment" && v.value === -1,
  );
  TestValidator.equals("found post upvote", postVotes.length, 1);
  TestValidator.equals("found comment downvote", commentVotes.length, 1);
  // 13. Validate each record has all required fields
  for (const vote of votePage.data) {
    TestValidator.predicate("vote has id", () => typeof vote.id === "string");
    TestValidator.predicate("vote has voter", () => vote.voter != null);
    TestValidator.predicate("vote has target_type", () =>
      ["post", "comment"].includes(vote.target_type),
    );
    TestValidator.predicate(
      "vote has target_id",
      () => typeof vote.target_id === "string",
    );
    TestValidator.predicate("vote has valid value", () =>
      [1, -1].includes(vote.value),
    );
    TestValidator.predicate(
      "vote has created_at",
      () => typeof vote.created_at === "string",
    );
    TestValidator.predicate(
      "vote has updated_at",
      () => typeof vote.updated_at === "string",
    );
  }
  // Validate the specific post upvote record matches
  TestValidator.equals(
    "post upvote references correct post",
    postVotes[0]!.target_id,
    post.id,
  );
  // Validate the specific comment downvote record matches
  TestValidator.equals(
    "comment downvote references correct comment",
    commentVotes[0]!.target_id,
    comment.id,
  );
}
