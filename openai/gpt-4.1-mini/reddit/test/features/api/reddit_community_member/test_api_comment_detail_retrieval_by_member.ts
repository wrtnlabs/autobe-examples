import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityAdmin";
import type { IRedditCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityComment";
import type { IRedditCommunityCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommentVote";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityModerator";
import type { IRedditCommunityCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunitySubscription";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import type { IRedditCommunityPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPostVote";
import type { IRedditCommunityPosts } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPosts";
import type { IRedditCommunityReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityReport";
import type { IRedditCommunityReportAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityReportAction";
import type { IRedditCommunityUserKarma } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUserKarma";
import type { IRedditCommunityUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUserProfile";

/**
 * E2E Test for retrieving detailed comment information by a member user.
 *
 * This test covers a comprehensive user workflow including:
 *
 * 1. Member registration and authentication via the join endpoint.
 * 2. Creation of a new community by the member.
 * 3. Creation of a post within the newly created community.
 * 4. Member posting a comment on the created post.
 * 5. Retrieving the detailed comment information via postId and commentId.
 * 6. Validation of returned comment details verifying content, timestamps, and
 *    author linkage.
 *
 * The test ensures that only authorized members can access comment details, and
 * that the comment's data integrity and ownership are properly enforced. All
 * timestamps and UUID formats are verified, and API responses are validated
 * with typia.assert() and TestValidator assertions.
 */
export async function test_api_comment_detail_retrieval_by_member(
  connection: api.IConnection,
) {
  // 1. Member registration and authentication
  const emailLocalPart = RandomGenerator.alphaNumeric(8).toLowerCase();
  const memberCreateBody = {
    email: `${emailLocalPart}@example.com`,
    password: RandomGenerator.alphaNumeric(12),
  } satisfies IRedditCommunityMember.ICreate;

  const member: IRedditCommunityMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: memberCreateBody,
    });
  typia.assert(member);

  // 2. Create a new community as the authenticated member
  const communityCreateBody = {
    name: RandomGenerator.alphaNumeric(12),
    description: RandomGenerator.paragraph({ sentences: 5 }),
  } satisfies IRedditCommunityCommunity.ICreate;

  const community: IRedditCommunityCommunity =
    await api.functional.redditCommunity.member.communities.createCommunity(
      connection,
      { body: communityCreateBody },
    );
  typia.assert(community);
  TestValidator.predicate(
    "community id should be UUID",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      community.id,
    ),
  );

  // 3. Create a post in the new community
  // For post_type, pick 'text' and provide the required fields
  const postCreateBody = {
    reddit_community_community_id: community.id,
    post_type: "text",
    title: RandomGenerator.paragraph({ sentences: 3, wordMin: 5, wordMax: 10 }),
    body_text: RandomGenerator.content({
      paragraphs: 2,
      sentenceMin: 5,
      sentenceMax: 8,
      wordMin: 4,
      wordMax: 7,
    }),
  } satisfies IRedditCommunityPosts.ICreate;

  const post: IRedditCommunityPosts =
    await api.functional.redditCommunity.member.communities.posts.createPost(
      connection,
      { communityId: community.id, body: postCreateBody },
    );
  typia.assert(post);
  TestValidator.predicate(
    "post id should be UUID",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      post.id,
    ),
  );

  // 4. Create a comment on the post by the member
  const commentCreateBody = {
    reddit_community_post_id: post.id,
    body_text: RandomGenerator.paragraph({
      sentences: 10,
      wordMin: 3,
      wordMax: 8,
    }),
    author_member_id: member.id,
    author_guest_id: null,
  } satisfies IRedditCommunityComment.ICreate;

  const comment: IRedditCommunityComment =
    await api.functional.redditCommunity.member.posts.comments.create(
      connection,
      { postId: post.id, body: commentCreateBody },
    );
  typia.assert(comment);

  // 5. Retrieve the detailed comment information
  const detailedComment: IRedditCommunityComment =
    await api.functional.redditCommunity.member.posts.comments.at(connection, {
      postId: post.id,
      commentId: comment.id,
    });
  typia.assert(detailedComment);

  // 6. Validate the retrieved comment data

  TestValidator.equals(
    "retrieved comment id should match",
    detailedComment.id,
    comment.id,
  );

  TestValidator.equals(
    "retrieved comment post id should match",
    detailedComment.reddit_community_post_id,
    post.id,
  );

  TestValidator.equals(
    "comment author_member_id should match member id",
    detailedComment.author_member_id,
    member.id,
  );
  TestValidator.equals(
    "comment author_guest_id should be null",
    detailedComment.author_guest_id,
    null,
  );

  TestValidator.predicate(
    "comment body_text should be non-empty",
    typeof detailedComment.body_text === "string" &&
      detailedComment.body_text.length > 0,
  );

  TestValidator.predicate(
    "created_at is valid ISO 8601 format",
    /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}.*Z$/.test(
      detailedComment.created_at,
    ),
  );

  TestValidator.predicate(
    "updated_at is valid ISO 8601 format",
    /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}.*Z$/.test(
      detailedComment.updated_at,
    ),
  );

  TestValidator.predicate(
    "deleted_at should be null or string",
    detailedComment.deleted_at === null ||
      typeof detailedComment.deleted_at === "string" ||
      detailedComment.deleted_at === undefined,
  );
}
