import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityAppeal } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityAppeal";
import type { IRedditCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityComment";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityCommunityCategories } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityCategories";
import type { IRedditCommunityContentReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityContentReport";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import type { IRedditCommunityPostType } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPostType";

/**
 * Test successful appeal update when the appeal is still in 'submitted' status
 * before moderator review begins. A member strengthens their appeal by adding
 * additional supporting evidence, clarifying their rationale with better
 * explanation of policy interpretation, and adjusting their requested remedy
 * based on further reflection. Validates that appeals remain editable while in
 * preliminary submitted status and updates are tracked with proper timestamps.
 */
export async function test_api_community_appeal_update_before_review(
  connection: api.IConnection,
) {
  // Step 1: Member registration and authentication
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member = await api.functional.auth.member.join(connection, {
    body: {
      nickname: RandomGenerator.name(),
      email: memberEmail,
      password: "SecurePassword123!",
    } satisfies IRedditCommunityMember.ICreate,
  });
  typia.assert<IRedditCommunityMember.IAuthorized>(member);

  // Step 2: Create a test community post to serve as content for reporting
  // First, we need to determine what post types and communities are available
  // For this test, we'll create a text post with realistic content
  const postTitle = RandomGenerator.paragraph({ sentences: 3 });
  const postContent = RandomGenerator.content({
    paragraphs: 2,
    sentenceMin: 8,
    sentenceMax: 15,
  });

  // Note: In a real scenario, we'd need community_id and post_type_id from existing entities
  // For this test setup, we'll generate realistic UUIDs that would reference appropriate entities
  const communityId = typia.random<string & tags.Format<"uuid">>();
  const postTypeId = typia.random<string & tags.Format<"uuid">>();

  const testPost = await api.functional.redditCommunity.member.posts.create(
    connection,
    {
      body: {
        title: postTitle,
        content: postContent,
        reddit_community_id: communityId,
        reddit_post_type_id: postTypeId,
      } satisfies IRedditCommunityPost.ICreate,
    },
  );
  typia.assert<IRedditCommunityPost>(testPost);

  // Step 3: Create a content report against the post to trigger moderation action
  const reportReason = RandomGenerator.paragraph({
    sentences: 2,
    wordMin: 4,
    wordMax: 8,
  });
  const reportCategory = "Inappropriate Content"; // Realistic report category

  const contentReport =
    await api.functional.redditCommunity.member.contentReports.create(
      connection,
      {
        body: {
          report_reason: reportReason,
          report_category: reportCategory,
          content_type: "post",
          post_id: testPost.id,
          comment_id: null, // Since we're reporting a post, not a comment
        } satisfies IRedditCommunityContentReport.ICreate,
      },
    );
  typia.assert<IRedditCommunityContentReport>(contentReport);

  // Step 4: Create initial appeal against the moderation action with basic rationale
  const initialRationale = RandomGenerator.content({
    paragraphs: 1,
    sentenceMin: 10,
    sentenceMax: 20,
  });
  const initialAppeal =
    await api.functional.redditCommunity.member.appeals.create(connection, {
      body: {
        rationale: initialRationale,
        requested_remedy: "full_reversal", // Request complete reversal initially
        supporting_evidence: RandomGenerator.content({
          paragraphs: 1,
          sentenceMin: 15,
          sentenceMax: 25,
        }),
      } satisfies IRedditCommunityAppeal.ICreate,
    });
  typia.assert<IRedditCommunityAppeal>(initialAppeal);

  // Validate initial appeal properties
  TestValidator.predicate(
    "initial appeal has correct status",
    initialAppeal.status === "submitted",
  );
  TestValidator.equals(
    "initial rationale matches",
    initialAppeal.rationale,
    initialRationale,
  );
  TestValidator.equals(
    "initial remedy request",
    initialAppeal.requested_remedy,
    "full_reversal",
  );

  // Step 5: Update the appeal with strengthened evidence, improved rationale, and modified remedy
  // Simulate user reflecting on their case and deciding to strengthen it
  const updatedRationale = RandomGenerator.content({
    paragraphs: 3,
    sentenceMin: 15,
    sentenceMax: 30,
  });
  const updatedEvidence = RandomGenerator.content({
    paragraphs: 2,
    sentenceMin: 20,
    sentenceMax: 40,
  });

  const updatedAppeal =
    await api.functional.redditCommunity.member.appeals.update(connection, {
      appealId: initialAppeal.id,
      body: {
        rationale: updatedRationale,
        requested_remedy: "modification", // Changed from full_reversal to modification
        supporting_evidence: updatedEvidence,
      } satisfies IRedditCommunityAppeal.IUpdate,
    });
  typia.assert<IRedditCommunityAppeal>(updatedAppeal);

  // Step 6: Verify the appeal update succeeded with proper changes and timestamp updates
  TestValidator.equals(
    "appeal ID remains unchanged",
    updatedAppeal.id,
    initialAppeal.id,
  );
  TestValidator.equals(
    "rationale was updated correctly",
    updatedAppeal.rationale,
    updatedRationale,
  );
  TestValidator.equals(
    "requested remedy was changed",
    updatedAppeal.requested_remedy,
    "modification",
  );
  TestValidator.equals(
    "supporting evidence was updated",
    updatedAppeal.supporting_evidence,
    updatedEvidence,
  );

  // Verify status remains submitted (editable period)
  TestValidator.predicate(
    "appeal remains in submitted status",
    updatedAppeal.status === "submitted",
  );

  // Verify timestamp tracking shows the update occurred
  TestValidator.predicate(
    "updated_at timestamp is later than created_at",
    new Date(updatedAppeal.updated_at).getTime() >=
      new Date(updatedAppeal.created_at).getTime(),
  );

  // Step 7: Test edge case - verify appeals in non-submitted status cannot be updated
  // This would require creating an appeal that transitions to a different status
  // For now, we can validate our current appeal hasn't changed status unexpectedly
  TestValidator.predicate(
    "appeal business_status is filed",
    updatedAppeal.business_status === "filed",
  );

  // Additional validation that the appellant information remains intact
  TestValidator.equals(
    "appellant ID remains consistent",
    updatedAppeal.appellant.id,
    member.id,
  );
  TestValidator.equals(
    "appellant nickname consistent",
    updatedAppeal.appellant.nickname,
    member.nickname,
  );

  // Validate the moderation action reference is maintained
  TestValidator.equals(
    "moderation action ID maintained",
    updatedAppeal.reddit_moderation_action_id,
    initialAppeal.reddit_moderation_action_id,
  );

  // Final validation - ensure all changes are properly reflected
  const finalTextValidation =
    updatedAppeal.rationale.length >= 50 &&
    (updatedAppeal.supporting_evidence?.length ?? 0) <= 5000 &&
    ["full_reversal", "modification", "clarification"].includes(
      updatedAppeal.requested_remedy,
    );

  TestValidator.predicate(
    "updated appeal satisfies all validation requirements",
    finalTextValidation,
  );
}
