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
 * Test appeal submission with only the minimum required fields - substantial
 * rationale and requested remedy without optional supporting evidence.
 * Validates that the appeals system accepts valid appeals even without
 * additional documentation, ensuring the minimum threshold for meaningful
 * review is maintained while keeping the submission process accessible to all
 * community members regardless of their ability to provide supplementary
 * materials.
 */
export async function test_api_community_appeal_submission_minimal_required_fields(
  connection: api.IConnection,
) {
  // Step 1: Register a member for appeal creation context
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const registeredMember = await api.functional.auth.member.join(connection, {
    body: {
      nickname: RandomGenerator.name(1),
      email: memberEmail,
      password: RandomGenerator.alphaNumeric(8),
    } satisfies IRedditCommunityMember.ICreate,
  });
  typia.assert(registeredMember);

  // Step 2: Create test content that will get moderated later
  const testPost = await api.functional.redditCommunity.member.posts.create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 5 }),
        content: RandomGenerator.content({ paragraphs: 3 }),
        link_url: null,
        reddit_community_id: typia.random<string & tags.Format<"uuid">>(),
        reddit_post_type_id: typia.random<string & tags.Format<"uuid">>(),
      } satisfies IRedditCommunityPost.ICreate,
    },
  );
  typia.assert(testPost);

  // Step 3: Report the post to trigger moderation action
  const contentReport =
    await api.functional.redditCommunity.member.contentReports.create(
      connection,
      {
        body: {
          report_reason: RandomGenerator.content({ paragraphs: 2 }),
          report_category: RandomGenerator.pick([
            "harassment",
            "spam",
            "hate speech",
            "misinformation",
          ]),
          post_id: testPost.id,
          comment_id: null,
          content_type: "post",
        } satisfies IRedditCommunityContentReport.ICreate,
      },
    );
  typia.assert(contentReport);

  // Step 4: Submit appeal with only minimum required fields (no supporting evidence)
  const appealReason = RandomGenerator.content({ paragraphs: 4 });
  const submittedAppeal =
    await api.functional.redditCommunity.member.appeals.create(connection, {
      body: {
        rationale: appealReason,
        requested_remedy: RandomGenerator.pick([
          "full_reversal",
          "modification",
          "clarification",
        ]),
        supporting_evidence: null,
      } satisfies IRedditCommunityAppeal.ICreate,
    });

  // Step 5: Validate appeal was created successfully
  typia.assert(submittedAppeal);

  // Validate appeal contains correct data
  TestValidator.predicate(
    "appeal should have substantial rationale",
    submittedAppeal.rationale.length >= 50,
  );
  TestValidator.equals(
    "appeal rationale matches submitted",
    submittedAppeal.rationale,
    appealReason,
  );
  TestValidator.predicate(
    "appeal should have valid requested remedy",
    ["full_reversal", "modification", "clarification"].includes(
      submittedAppeal.requested_remedy,
    ),
  );
  TestValidator.predicate(
    "appeal supporting evidence should be null",
    submittedAppeal.supporting_evidence === null ||
      submittedAppeal.supporting_evidence === undefined,
  );
  TestValidator.predicate(
    "appeal status should be submitted",
    submittedAppeal.status === "submitted",
  );
  TestValidator.predicate(
    "appeal business status should be filed",
    submittedAppeal.business_status === "filed",
  );
  TestValidator.predicate(
    "appeal appellant should match current member",
    submittedAppeal.appellant.id === registeredMember.id,
  );
  TestValidator.predicate(
    "appeal appellant nickname should match",
    submittedAppeal.appellant.nickname === registeredMember.nickname,
  );
  TestValidator.predicate(
    "appeal should have default timestamps",
    submittedAppeal.created_at !== null && submittedAppeal.updated_at !== null,
  );
  TestValidator.predicate(
    "appeal timestamp format should be valid",
    submittedAppeal.appealed_at > submittedAppeal.created_at ||
      submittedAppeal.appealed_at === submittedAppeal.created_at,
  );
  TestValidator.predicate(
    "appeal decision fields should be null initially",
    submittedAppeal.decision === null || submittedAppeal.decision === undefined,
  );
  TestValidator.predicate(
    "appeal decision reasoning should be null initially",
    submittedAppeal.decision_reasoning === null ||
      submittedAppeal.decision_reasoning === undefined,
  );
  TestValidator.predicate(
    "appeal responds_at should be null initially",
    submittedAppeal.responded_at === null ||
      submittedAppeal.responded_at === undefined,
  );
  TestValidator.predicate(
    "appeal soft delete should be null initially",
    submittedAppeal.deleted_at === null ||
      submittedAppeal.deleted_at === undefined,
  );
}
