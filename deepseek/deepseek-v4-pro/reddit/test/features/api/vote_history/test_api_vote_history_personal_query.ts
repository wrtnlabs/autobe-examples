import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityHubComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubComment";
import type { ICommunityHubCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubCommunity";
import type { ICommunityHubCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubCommunitySubscription";
import type { ICommunityHubMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubMember";
import type { ICommunityHubPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubPost";
import type { ICommunityHubPostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubPostImage";
import type { ICommunityHubVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubVote";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityHubVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityHubVote";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_community_hub_communities_posts_create } from "../../../generate/generate_random_community_hub_communities_posts_create";
import { generate_random_community_hub_member_communities_create } from "../../../generate/generate_random_community_hub_member_communities_create";
import { generate_random_community_hub_posts_comments_create } from "../../../generate/generate_random_community_hub_posts_comments_create";
import { prepare_random_community_hub_comment } from "../../../prepare/prepare_random_community_hub_comment";
import { prepare_random_community_hub_community } from "../../../prepare/prepare_random_community_hub_community";
import { prepare_random_community_hub_post } from "../../../prepare/prepare_random_community_hub_post";

/**
 * Test querying personal vote history after casting an upvote on a post and a downvote on a comment.
 *
 * Validates that the vote history endpoint correctly returns vote records filtered by member_id. The test covers the full lifecycle: member registration, community creation, subscription, post creation, comment creation, voting on both a post (upvote) and a comment (downvote), and finally querying the history.
 *
 * Special attention is given to verifying that each vote record contains the correct value (1 for upvote, -1 for downvote), target_type discriminator ("post" or "comment"), target_id reference, member summary with username, and both created_at/updated_at timestamps. Pagination metadata is also validated to confirm records=2, pages=1, current=1.
 *
 * 1. Member registers and authenticates via authorize_member_join.
 * 2. Member creates a community and subscribes to it.
 * 3. Member creates a text post in the community.
 * 4. Member creates a top-level comment on the post.
 * 5. Member upvotes the post (value=1).
 * 6. Member downvotes the comment (value=-1).
 * 7. Member queries vote history filtering by their own member_id.
 * 8. Validates response contains exactly two vote records with correct values, target types, target IDs, member info, timestamps, and pagination.
 */
export async function test_api_vote_history_personal_query(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate a member
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {});
  typia.assert(member);
  // 2. Create a community
  const community =
    await generate_random_community_hub_member_communities_create(
      memberConnection,
      {},
    );
  typia.assert(community);
  // 3. Subscribe to the community
  const subscription =
    await api.functional.communityHub.member.communities.subscriptions.create(
      memberConnection,
      { communityName: community.name },
    );
  typia.assert(subscription);
  // 4. Create a text post
  const post = await generate_random_community_hub_communities_posts_create(
    memberConnection,
    {
      body: { type: "text" },
      params: { communityName: community.name },
    },
  );
  typia.assert(post);
  // 5. Create a top-level comment
  const comment = await generate_random_community_hub_posts_comments_create(
    memberConnection,
    { params: { postId: post.id } },
  );
  typia.assert(comment);
  // 6. Upvote the post
  const postVote = await api.functional.communityHub.member.posts.upvote(
    memberConnection,
    { postId: post.id },
  );
  typia.assert(postVote);
  // 7. Downvote the comment
  const commentVote =
    await api.functional.communityHub.member.comments.downvote(
      memberConnection,
      { commentId: comment.id },
    );
  typia.assert(commentVote);
  // 8. Query vote history filtering by member_id
  const voteHistory = await api.functional.communityHub.member.votes.index(
    memberConnection,
    {
      body: {
        member_id: member.id,
      } satisfies ICommunityHubVote.IRequest,
    },
  );
  typia.assert(voteHistory);
  // 9. Validate response
  TestValidator.equals("vote count", voteHistory.data.length, 2);
  // Pagination metadata
  TestValidator.equals("pagination records", voteHistory.pagination.records, 2);
  TestValidator.equals("pagination pages", voteHistory.pagination.pages, 1);
  TestValidator.equals("pagination current", voteHistory.pagination.current, 1);
  // Find each vote by target_type
  const foundPostVote = voteHistory.data.find((v) => v.target_type === "post");
  const foundCommentVote = voteHistory.data.find(
    (v) => v.target_type === "comment",
  );
  TestValidator.predicate("post vote exists", foundPostVote != null);
  TestValidator.predicate("comment vote exists", foundCommentVote != null);
  const postRecord = foundPostVote!;
  const commentRecord = foundCommentVote!;
  // Post vote: upvote (value=1), correct target
  TestValidator.equals("post vote value", postRecord.value, 1);
  TestValidator.equals("post vote target_id", postRecord.target_id, post.id);
  // Comment vote: downvote (value=-1), correct target
  TestValidator.equals("comment vote value", commentRecord.value, -1);
  TestValidator.equals(
    "comment vote target_id",
    commentRecord.target_id,
    comment.id,
  );
  // Member summary matches
  TestValidator.equals(
    "post vote member username",
    postRecord.member.username,
    member.username,
  );
  TestValidator.equals(
    "comment vote member username",
    commentRecord.member.username,
    member.username,
  );
  // Timestamps present on both records
  TestValidator.predicate(
    "post vote created_at exists",
    postRecord.created_at.length > 0,
  );
  TestValidator.predicate(
    "post vote updated_at exists",
    postRecord.updated_at.length > 0,
  );
  TestValidator.predicate(
    "comment vote created_at exists",
    commentRecord.created_at.length > 0,
  );
  TestValidator.predicate(
    "comment vote updated_at exists",
    commentRecord.updated_at.length > 0,
  );
}
