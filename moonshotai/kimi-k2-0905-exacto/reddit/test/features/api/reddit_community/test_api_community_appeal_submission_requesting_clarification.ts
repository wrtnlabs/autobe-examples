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

export async function test_api_community_appeal_submission_requesting_clarification(
  connection: api.IConnection,
) {
  // Step 1: Register as a new member to establish authenticated context
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member = await api.functional.auth.member.join(connection, {
    body: {
      nickname: RandomGenerator.name(),
      email: memberEmail,
      password: "SecurePassword123!",
    } satisfies IRedditCommunityMember.ICreate,
  });
  typia.assert(member);

  // Step 2: Create a community post that will be reported for policy violation
  const communityId = typia.random<string & tags.Format<"uuid">>();
  const postTypeId = typia.random<string & tags.Format<"uuid">>();

  const post = await api.functional.redditCommunity.member.posts.create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 1 }),
        content: RandomGenerator.content({
          paragraphs: 2,
          sentenceMin: 5,
          sentenceMax: 10,
        }),
        reddit_community_id: communityId,
        reddit_post_type_id: postTypeId,
      } satisfies IRedditCommunityPost.ICreate,
    },
  );
  typia.assert(post);

  // Step 3: Create a content report to establish a moderation context
  // Note: In a real system, this would trigger a moderation action
  const report =
    await api.functional.redditCommunity.member.contentReports.create(
      connection,
      {
        body: {
          report_reason:
            "Content violates community guidelines regarding respectful discourse",
          report_category: "harassment",
          content_type: "post",
          post_id: post.id,
        } satisfies IRedditCommunityContentReport.ICreate,
      },
    );
  typia.assert(report);

  // Step 4: Submit an appeal requesting clarification about policy application
  // Using a random UUID for moderation_action_id since we don't have an API to create moderation actions
  // In a real system, this would reference an actual moderation action
  const mockModerationActionId = typia.random<string & tags.Format<"uuid">>();

  const appeal = await api.functional.redditCommunity.member.appeals.create(
    connection,
    {
      body: {
        rationale:
          "I understand that my post may have violated community guidelines, but I'm unclear about the specific rule that was applied and the severity level of the violation. I want to better understand the policy so I can contribute appropriately to the community in the future. Could you please clarify which specific guideline was violated and provide guidance on how to avoid similar issues?",
        requested_remedy: "clarification",
        supporting_evidence:
          "The post was intended to discuss community standards, not to harass anyone. I believe there may have been a misunderstanding about the context and intent of my message. I'm seeking clarification to improve my understanding of the community guidelines.",
      } satisfies IRedditCommunityAppeal.ICreate,
    },
  );
  typia.assert(appeal);

  // Validate that the appeal was created successfully with the correct details
  TestValidator.equals(
    "appeal rationale should contain clarification request",
    appeal.rationale.includes("clarification"),
    true,
  );
  TestValidator.equals(
    "requested remedy should be clarification",
    appeal.requested_remedy,
    "clarification",
  );
  TestValidator.equals(
    "appeal should be from correct appellant",
    appeal.appellant.id,
    member.id,
  );
  TestValidator.predicate(
    "appeal status should be in initial state",
    () => appeal.status === "submitted" || appeal.status === "pending",
  );
  TestValidator.predicate(
    "appeal business status should be in initial state",
    () =>
      appeal.business_status === "filed" ||
      appeal.business_status === "submitted",
  );

  // Validate that supporting evidence is included
  TestValidator.predicate(
    "supporting evidence should be provided",
    () =>
      appeal.supporting_evidence !== null &&
      appeal.supporting_evidence !== undefined,
  );

  // Validate that decision fields are null since appeal hasn't been reviewed yet
  TestValidator.equals(
    "decision should be null initially",
    appeal.decision,
    null,
  );
  TestValidator.equals(
    "decision reasoning should be null initially",
    appeal.decision_reasoning,
    null,
  );
  TestValidator.equals(
    "response time should be null initially",
    appeal.responded_at,
    null,
  );

  // Validate appeal timeline
  TestValidator.predicate("appeal should have been created recently", () => {
    const createdTime = new Date(appeal.created_at).getTime();
    const currentTime = Date.now();
    return currentTime - createdTime < 60000; // Within last minute
  });
}
