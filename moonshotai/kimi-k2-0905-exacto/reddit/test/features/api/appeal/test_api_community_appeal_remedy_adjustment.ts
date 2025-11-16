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
 * Test appeal update where the member changes their requested remedy based on
 * better understanding of the situation. Initially requesting full reversal,
 * the member realizes their violation was minor but the punishment excessive,
 * changing their request from complete reversal to modification of the
 * moderation action's severity. Validates that remedy adjustments are permitted
 * when they represent genuine clarification rather than entirely new appeal
 * requests.
 */
export async function test_api_community_appeal_remedy_adjustment(
  connection: api.IConnection,
) {
  // Step 1: Create authenticated member account
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member = await api.functional.auth.member.join(connection, {
    body: {
      nickname: RandomGenerator.name(),
      email: memberEmail,
      password: "SecurePassword123!",
    } satisfies IRedditCommunityMember.ICreate,
  });
  typia.assert(member);

  // Step 2: Create a comment to establish content that can be reported
  // This simulates a member posting content that could be reported
  const communityName = RandomGenerator.alphabets(8);
  const postId = typia.random<string & tags.Format<"uuid">>();

  const comment = await api.functional.redditCommunity.member.comments.create(
    connection,
    {
      body: {
        content: RandomGenerator.content({
          paragraphs: 1,
          sentenceMin: 3,
          sentenceMax: 5,
        }),
        reddit_post_id: postId,
        href: `https://reddit-community.com/r/${communityName}/posts/${postId}`,
        referrer: `https://reddit-community.com/r/${communityName}`,
      } satisfies IRedditCommunityComment.ICreate,
    },
  );
  typia.assert(comment);

  // Step 3: Create a content report for the comment to simulate moderation action context
  const reportCategory = RandomGenerator.pick([
    "harassment",
    "spam",
    "hate_speech",
    "misinformation",
  ] as const);
  const contentReport =
    await api.functional.redditCommunity.member.contentReports.create(
      connection,
      {
        body: {
          report_reason: `User's comment contains potentially inappropriate content categorized as ${reportCategory}`,
          report_category: reportCategory,
          content_type: "comment",
          comment_id: comment.id,
        } satisfies IRedditCommunityContentReport.ICreate,
      },
    );
  typia.assert(contentReport);

  // Step 4: Create initial appeal requesting "full_reversal"
  const appealReasoning = `I believe the moderation action taken against my comment was excessive and unjustified. The content I posted was intended to contribute meaningful discussion within the community and did not violate any specific community guidelines. The moderation decision appears to have been applied without proper consideration of the context and intent behind my comment. I respectfully request that this action be reviewed and completely reversed.`;

  const initialAppeal =
    await api.functional.redditCommunity.member.appeals.create(connection, {
      body: {
        rationale: appealReasoning,
        requested_remedy: "full_reversal",
        supporting_evidence: `My comment was created with the intention of contributing constructively to the community discussion. The content was carefully worded to avoid any policy violations and was based on factual information. I have been an active and respectful member of this community, consistently engaging positively with other members.`,
      } satisfies IRedditCommunityAppeal.ICreate,
    });
  typia.assert(initialAppeal);

  // Validate initial appeal has the correct remedy request
  TestValidator.equals(
    "initial appeal should request full reversal",
    initialAppeal.requested_remedy,
    "full_reversal",
  );
  TestValidator.equals(
    "initial appeal status should be submitted",
    initialAppeal.status,
    "submitted",
  );

  // Step 5: Update the appeal to change remedy from "full_reversal" to "modification"
  const updatedReasoning = `${appealReasoning}\n\nUpon further reflection and review of the community guidelines, I realize that while my comment was intended to contribute constructively, it may have inadvertently contained content that could be interpreted as borderline policy violation. However, I believe the current moderation action is overly severe for what appears to be a minor infraction rather than a deliberate violation. I respectfully request that instead of complete reversal, the moderation action be modified to a more proportionate response that acknowledges both my intent to contribute positively and the need for community guideline adherence.`;

  const updatedAppeal =
    await api.functional.redditCommunity.member.appeals.update(connection, {
      appealId: initialAppeal.id,
      body: {
        rationale: updatedReasoning,
        requested_remedy: "modification",
        supporting_evidence: `${initialAppeal.supporting_evidence ?? ""}\n\nAdditional context: After reviewing similar cases within the community and reflecting on the specific wording of my comment, I believe a more nuanced approach would be appropriate. This would allow me to continue contributing to the community while acknowledging the importance of maintaining community standards.`,
      } satisfies IRedditCommunityAppeal.IUpdate,
    });
  typia.assert(updatedAppeal);

  // Step 6: Validate the appeal update was successful
  TestValidator.equals(
    "updated appeal should have same ID",
    updatedAppeal.id,
    initialAppeal.id,
  );
  TestValidator.equals(
    "updated appeal should have changed remedy to modification",
    updatedAppeal.requested_remedy,
    "modification",
  );
  TestValidator.equals(
    "updated appeal should maintain submitted status",
    updatedAppeal.status,
    "submitted",
  );
  TestValidator.notEquals(
    "updated appeal should have different updated_at timestamp",
    updatedAppeal.updated_at,
    initialAppeal.updated_at,
  );

  // Validate that the rationale was updated with additional reasoning
  TestValidator.predicate(
    "updated rationale should be longer than initial rationale",
    updatedAppeal.rationale.length > initialAppeal.rationale.length,
  );
  TestValidator.predicate(
    "updated rationale should contain original reasoning",
    updatedAppeal.rationale.includes(appealReasoning),
  );
  TestValidator.predicate(
    "updated rationale should contain new modification reasoning",
    updatedAppeal.rationale.includes("Upon further reflection"),
  );

  // Validate business entity references remain consistent
  TestValidator.equals(
    "updated appeal should reference same appellant",
    updatedAppeal.appellant.id,
    initialAppeal.appellant.id,
  );
  TestValidator.equals(
    "updated appeal should reference same moderation action",
    updatedAppeal.reddit_moderation_action_id,
    initialAppeal.reddit_moderation_action_id,
  );
}
