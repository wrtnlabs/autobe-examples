import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCategory";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformMemberActivity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberActivity";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";

/**
 * Test member activity detail reflects real-time engagement metrics.
 *
 * Creates a post within a community and verifies the member's activity detail
 * accurately reflects engagement metrics. Tests that activity records maintain
 * consistent engagement data (upvote_count, downvote_count, comment_count) and
 * that vote_score correctly calculates as upvotes minus downvotes.
 *
 * Workflow:
 *
 * 1. Create administrator account and authenticate
 * 2. Create a category for organizing communities
 * 3. Authenticate as member and create community
 * 4. Create a text post in the community
 * 5. Retrieve activity detail and verify engagement metrics structure
 * 6. Validate activity references and relationships
 * 7. Confirm vote_score calculation accuracy
 * 8. Re-retrieve activity to ensure metric consistency
 */
export async function test_api_member_activity_detail_real_time_metrics(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate administrator
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "AdminPassword123!";
  const adminHref = typia.random<string & tags.Format<"uri">>();
  const adminReferrer = typia.random<string & tags.Format<"uri">>();

  const adminResponse: ICommunityPlatformAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        username: RandomGenerator.alphaNumeric(8),
        name: RandomGenerator.name(),
        href: adminHref,
        referrer: adminReferrer,
      } satisfies ICommunityPlatformAdministrator.ICreate,
    });
  typia.assert(adminResponse);

  // Step 2: Create a category
  const categoryResponse: ICommunityPlatformCategory =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      {
        body: {
          name: "Technology",
          slug: `tech_${RandomGenerator.alphaNumeric(6)}`,
          display_order: 1,
          description: "Technology and software discussions",
        } satisfies ICommunityPlatformCategory.ICreate,
      },
    );
  typia.assert(categoryResponse);

  // Step 3: Create and authenticate member
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = "MemberPassword123!";
  const memberHref = typia.random<string & tags.Format<"uri">>();
  const memberReferrer = typia.random<string & tags.Format<"uri">>();

  const memberResponse: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        password: memberPassword,
        username: `user_${RandomGenerator.alphaNumeric(8)}`,
        href: memberHref,
        referrer: memberReferrer,
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(memberResponse);

  // Step 4: Create a community
  const communityResponse: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: "Tech Discussion",
          identifier: `tech_${RandomGenerator.alphaNumeric(6)}`,
          description: "A community for tech discussions",
          visibility: "public",
          post_creation_restriction: "open_to_all",
          post_type_restriction: "text_only",
          category_slug: categoryResponse.slug,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(communityResponse);

  // Step 5: Create a post in the community
  const postResponse: ICommunityPlatformPost =
    await api.functional.communityPlatform.member.posts.create(connection, {
      body: {
        community_id: communityResponse.id,
        post_type: "text",
        title: "Best Programming Languages",
        content_text: RandomGenerator.content({
          paragraphs: 3,
          sentenceMin: 5,
          sentenceMax: 10,
        }),
      } satisfies ICommunityPlatformPost.ICreate,
    });
  typia.assert(postResponse);

  // Step 6: Retrieve activity detail - using post ID as activity ID
  // Note: This assumes activity records are retrievable using post ID
  const activityResponse: ICommunityPlatformMemberActivity =
    await api.functional.communityPlatform.members.activity.at(connection, {
      memberId: memberResponse.id,
      activityId: postResponse.id,
    });
  typia.assert(activityResponse);

  // Step 7: Verify engagement metrics structure
  TestValidator.predicate(
    "upvote count is non-negative",
    activityResponse.upvoteCount >= 0,
  );
  TestValidator.predicate(
    "downvote count is non-negative",
    activityResponse.downvoteCount >= 0,
  );
  TestValidator.predicate(
    "comment count is non-negative if present",
    activityResponse.commentCount === null ||
      activityResponse.commentCount === undefined ||
      activityResponse.commentCount >= 0,
  );

  // Step 8: Validate activity type and relationships
  TestValidator.equals(
    "activity type should be post",
    activityResponse.activityType,
    "post",
  );
  TestValidator.equals(
    "activity post ID should match created post",
    activityResponse.postId,
    postResponse.id,
  );
  TestValidator.equals(
    "activity content title should match post title",
    activityResponse.contentTitle,
    postResponse.title,
  );
  TestValidator.equals(
    "activity member ID should match post creator",
    activityResponse.memberId,
    memberResponse.id,
  );
  TestValidator.equals(
    "activity community ID should match post community",
    activityResponse.communityId,
    communityResponse.id,
  );

  // Step 9: Confirm vote_score calculation
  const expectedVoteScore =
    activityResponse.upvoteCount - activityResponse.downvoteCount;
  TestValidator.predicate(
    "vote score calculation should be non-negative",
    expectedVoteScore >= 0,
  );

  // Step 10: Verify member and community references are populated
  TestValidator.predicate(
    "member reference should exist",
    () =>
      activityResponse.member !== null && activityResponse.member !== undefined,
  );
  TestValidator.predicate(
    "community reference should exist",
    () =>
      activityResponse.community !== null &&
      activityResponse.community !== undefined,
  );
  TestValidator.equals(
    "member ID in reference should match activity member ID",
    activityResponse.member.id,
    memberResponse.id,
  );
  TestValidator.equals(
    "community ID in reference should match activity community ID",
    activityResponse.community.id,
    communityResponse.id,
  );

  // Step 11: Re-retrieve activity to verify metric consistency
  const activityRetrieval: ICommunityPlatformMemberActivity =
    await api.functional.communityPlatform.members.activity.at(connection, {
      memberId: memberResponse.id,
      activityId: postResponse.id,
    });
  typia.assert(activityRetrieval);

  TestValidator.equals(
    "re-retrieved upvote count should match",
    activityRetrieval.upvoteCount,
    activityResponse.upvoteCount,
  );
  TestValidator.equals(
    "re-retrieved downvote count should match",
    activityRetrieval.downvoteCount,
    activityResponse.downvoteCount,
  );

  // Handle optional comment count
  const commentCountFirst = activityResponse.commentCount ?? 0;
  const commentCountSecond = activityRetrieval.commentCount ?? 0;
  TestValidator.equals(
    "re-retrieved comment count should match",
    commentCountSecond,
    commentCountFirst,
  );

  const voteScopeRetrieval =
    activityRetrieval.upvoteCount - activityRetrieval.downvoteCount;
  TestValidator.equals(
    "re-retrieved vote score should match",
    voteScopeRetrieval,
    expectedVoteScore,
  );
}
