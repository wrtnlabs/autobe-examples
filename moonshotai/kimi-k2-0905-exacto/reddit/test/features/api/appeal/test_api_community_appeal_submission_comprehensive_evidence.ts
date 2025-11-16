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

/**
 * Test appeal submission with comprehensive supporting evidence including
 * multiple types of documentation. A member submits an appeal with the maximum
 * allowed evidence (5000 characters) including detailed screenshots, context
 * explanations, policy interpretations, comparisons to similar cases, and
 * community standards clarification. Validates that the system properly handles
 * extended evidence content and maintains the evidence integrity throughout the
 * appeal review process.
 *
 * Steps:
 *
 * 1. Create member authentication
 * 2. Create a post to generate moderation content
 * 3. Submit a content report to establish an appealable moderation action
 * 4. Compose comprehensive appeal with maximum allowed details (5000 characters)
 * 5. Submit the appeal to challenge the moderation
 * 6. Verify the submission success and data integrity
 */
export async function test_api_community_appeal_submission_comprehensive_evidence(
  connection: api.IConnection,
) {
  // Step 1: Register a new member
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberNickname = RandomGenerator.alphabets(16);

  const member: IRedditCommunityMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        nickname: memberNickname,
        password: RandomGenerator.alphaNumeric(12),
      } satisfies IRedditCommunityMember.ICreate,
    });
  typia.assert(member);

  // Step 2: Create a post that could be reported
  const postContent = RandomGenerator.content({
    paragraphs: 5,
    sentenceMin: 10,
    sentenceMax: 20,
    wordMin: 4,
    wordMax: 8,
  });

  const postId = typia.random<string & tags.Format<"uuid">>();

  // Create a comment to establish content for reporting
  const comment: IRedditCommunityComment =
    await api.functional.redditCommunity.member.comments.create(connection, {
      body: {
        content: postContent,
        reddit_post_id: postId,
        href: "https://community.example.com/post/123",
        referrer: "https://community.example.com/top",
      } satisfies IRedditCommunityComment.ICreate,
    });
  typia.assert(comment);

  // Step 3: Submit a content report to establish an appealable moderation action
  const report: IRedditCommunityContentReport =
    await api.functional.redditCommunity.member.contentReports.create(
      connection,
      {
        body: {
          report_reason:
            "This content violates community guidelines by containing inappropriate material that should be moderated and reviewed according to our established policies",
          report_category: "content-quality",
          content_type: "comment",
          comment_id: comment.id,
        } satisfies IRedditCommunityContentReport.ICreate,
      },
    );
  typia.assert(report);

  // Step 4: Compose comprehensive appeal with extensive evidence (5000 characters)
  const comprehensiveEvidence = ArrayUtil.repeat(5, () =>
    RandomGenerator.content({
      paragraphs: 4,
      sentenceMin: 20,
      sentenceMax: 30,
      wordMin: 5,
      wordMax: 10,
    }),
  ).join("\n\n");

  // Truncate to exactly 5000 characters to test maximum limit
  const maxEvidence = comprehensiveEvidence.substring(0, 5000);

  const rationaleContent = RandomGenerator.content({
    paragraphs: 6,
    sentenceMin: 15,
    sentenceMax: 25,
    wordMin: 6,
    wordMax: 12,
  });

  // Step 5: Submit comprehensive appeal with full documentation
  const appeal: IRedditCommunityAppeal =
    await api.functional.redditCommunity.member.appeals.create(connection, {
      body: {
        rationale: `I am formally appealing the moderation action taken against my content because I believe it was applied unfairly and requires reconsideration based on several key factors. ${rationaleContent}`,
        requested_remedy: "full_reversal",
        supporting_evidence: maxEvidence,
      } satisfies IRedditCommunityAppeal.ICreate,
    });
  typia.assert(appeal);

  // Step 6: Verify submission success and data integrity
  TestValidator.equals(
    "Appeal submittion successful",
    appeal.appellant.id,
    member.id,
  );
  TestValidator.equals(
    "Appeal rationale preserved",
    appeal.rationale.startsWith("I am formally appealing"),
    true,
  );
  TestValidator.equals(
    "Appeal status is submitted",
    appeal.status,
    "submitted",
  );
  TestValidator.equals(
    "Appeal business status is filed",
    appeal.business_status,
    "filed",
  );
  TestValidator.predicate(
    "Appeal has creation timestamp",
    appeal.created_at !== null,
  );
  TestValidator.predicate(
    "Appeal has appellant info",
    appeal.appellant.nickname === memberNickname,
  );
  TestValidator.equals(
    "Requested remedy is full reaversal",
    appeal.requested_remedy,
    "full_reversal",
  );

  // Verify evidence integrity - should match exactly what was submitted
  TestValidator.equals(
    "Supporting evidence integrity maintained",
    appeal.supporting_evidence,
    maxEvidence,
  );
  TestValidator.predicate(
    "Evidence reaches maximum length",
    appeal.supporting_evidence!.length === 5000,
  );
}
