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
 * Test appeal update with only selective field modifications. A member only
 * updates their supporting evidence without changing rationale or requested
 * remedy, demonstrating that the system supports partial updates without
 * requiring complete resubmission. Validates that unchanged fields remain
 * intact while updated fields are properly modified, and that partial updates
 * maintain appeal integrity and review eligibility status.
 */
export async function test_api_community_appeal_partial_field_update(
  connection: IConnection,
): Promise<void> {
  // Step 1: Create and authenticate as a member
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member = await api.functional.auth.member.join(connection, {
    body: {
      nickname: RandomGenerator.alphabets(10),
      email: memberEmail,
      password: "StrongPassword123",
    } satisfies IRedditCommunityMember.ICreate,
  });
  typia.assert(member);

  // Step 2: Create a community post to establish content for reporting
  const postTitle = RandomGenerator.paragraph({ sentences: 2 });
  const postContent = RandomGenerator.content({ paragraphs: 2 });
  const post = await api.functional.redditCommunity.member.posts.create(
    connection,
    {
      body: {
        title: postTitle,
        content: postContent,
        reddit_community_id: typia.random<string & tags.Format<"uuid">>(),
        reddit_post_type_id: typia.random<string & tags.Format<"uuid">>(),
      } satisfies IRedditCommunityPost.ICreate,
    },
  );
  typia.assert(post);

  // Step 3: Report the post to generate a moderation action for appeal
  const reportReason = RandomGenerator.paragraph({ sentences: 2 });
  const reportCategory = RandomGenerator.pick([
    "harassment",
    "spam",
    "hate_speech",
    "misinformation",
  ] as const);
  const report =
    await api.functional.redditCommunity.member.contentReports.create(
      connection,
      {
        body: {
          report_reason: reportReason,
          report_category: reportCategory,
          content_type: "post",
          post_id: post.id,
          comment_id: null,
        } satisfies IRedditCommunityContentReport.ICreate,
      },
    );
  typia.assert(report);

  // Step 4: Create an initial appeal against the moderation action
  const initialRationale = RandomGenerator.content({ paragraphs: 3 });
  const initialRemedy = RandomGenerator.pick([
    "full_reversal",
    "modification",
    "clarification",
  ] as const);
  const initialEvidence = RandomGenerator.content({ paragraphs: 1 });

  const initialAppeal =
    await api.functional.redditCommunity.member.appeals.create(connection, {
      body: {
        rationale: initialRationale,
        requested_remedy: initialRemedy,
        supporting_evidence: initialEvidence,
      } satisfies IRedditCommunityAppeal.ICreate,
    });
  typia.assert(initialAppeal);

  // Step 5: Partially update only the supporting evidence field
  const updatedEvidence = RandomGenerator.content({ paragraphs: 2 });
  const updatedAppeal =
    await api.functional.redditCommunity.member.appeals.update(connection, {
      appealId: initialAppeal.id,
      body: {
        supporting_evidence: updatedEvidence,
      } satisfies IRedditCommunityAppeal.IUpdate,
    });
  typia.assert(updatedAppeal);

  // Step 6: Verify that only the supporting evidence was updated
  TestValidator.equals(
    "appeal ID remains unchanged",
    updatedAppeal.id,
    initialAppeal.id,
  );
  TestValidator.equals(
    "rationale remains unchanged",
    updatedAppeal.rationale,
    initialAppeal.rationale,
  );
  TestValidator.equals(
    "requested remedy remains unchanged",
    updatedAppeal.requested_remedy,
    initialAppeal.requested_remedy,
  );
  TestValidator.equals(
    "supporting evidence was updated",
    updatedAppeal.supporting_evidence,
    updatedEvidence,
  );
  TestValidator.equals(
    "status remains 'submitted'",
    updatedAppeal.status,
    initialAppeal.status,
  );
  TestValidator.equals(
    "business status unchanged",
    updatedAppeal.business_status,
    initialAppeal.business_status,
  );
  TestValidator.equals(
    "appellant unchanged",
    updatedAppeal.appellant.id,
    initialAppeal.appellant.id,
  );
  TestValidator.equals(
    "moderation action reference unchanged",
    updatedAppeal.reddit_moderation_action_id,
    initialAppeal.reddit_moderation_action_id,
  );
  TestValidator.equals(
    "appealed timestamp unchanged",
    updatedAppeal.appealed_at,
    initialAppeal.appealed_at,
  );
  TestValidator.equals(
    "created timestamp unchanged",
    updatedAppeal.created_at,
    initialAppeal.created_at,
  );
  TestValidator.predicate(
    "updated timestamp is different",
    updatedAppeal.updated_at !== initialAppeal.updated_at,
  );

  // Step 7: Validate partial update preserves appeal integrity
  TestValidator.predicate("appeal is not null", updatedAppeal !== null);
  TestValidator.predicate(
    "decision not made yet",
    updatedAppeal.decision === null,
  );
  TestValidator.predicate(
    "decision reasoning not set yet",
    updatedAppeal.decision_reasoning === null,
  );
  TestValidator.predicate(
    "responded timestamp not set yet",
    updatedAppeal.responded_at === null,
  );
  TestValidator.predicate(
    "soft delete not applied",
    updatedAppeal.deleted_at === null || updatedAppeal.deleted_at === undefined,
  );
  TestValidator.predicate(
    "updated timestamp is newer than created",
    new Date(updatedAppeal.updated_at).getTime() >=
      new Date(updatedAppeal.created_at).getTime(),
  );

  // Step 8: Test another partial update - this time update only rationale
  const updatedRationale = RandomGenerator.content({ paragraphs: 2 });
  const secondUpdate =
    await api.functional.redditCommunity.member.appeals.update(connection, {
      appealId: updatedAppeal.id,
      body: {
        rationale: updatedRationale,
      } satisfies IRedditCommunityAppeal.IUpdate,
    });
  typia.assert(secondUpdate);

  // Step 9: Verify second partial update
  TestValidator.equals(
    "rationale was updated in second update",
    secondUpdate.rationale,
    updatedRationale,
  );
  TestValidator.equals(
    "previous evidence update preserved",
    secondUpdate.supporting_evidence,
    updatedEvidence,
  );
  TestValidator.equals(
    "original remedy request preserved",
    secondUpdate.requested_remedy,
    initialRemedy,
  );
  TestValidator.equals(
    "second update timestamp changed",
    secondUpdate.updated_at,
    updatedAppeal.updated_at,
  );
  TestValidator.predicate(
    "second update timestamp is newer",
    new Date(secondUpdate.updated_at).getTime() >
      new Date(updatedAppeal.updated_at).getTime(),
  );

  // Step 10: Final validation - ensure appeal remains in reviewable state
  TestValidator.equals(
    "status still submitted after both updates",
    secondUpdate.status,
    "submitted",
  );
  TestValidator.equals(
    "business status still reviewable",
    secondUpdate.business_status,
    initialAppeal.business_status,
  );
  TestValidator.predicate(
    "appeal ready for moderator review",
    secondUpdate.status === "submitted" &&
      secondUpdate.business_status === "filed",
  );
}
