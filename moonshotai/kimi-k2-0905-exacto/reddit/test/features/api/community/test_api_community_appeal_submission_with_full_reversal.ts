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

export async function test_api_community_appeal_submission_with_full_reversal(
  connection: api.IConnection,
) {
  // Step 1: Register a new member account to create an appeal
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberNickname = RandomGenerator.name();
  const member = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      nickname: memberNickname,
      password: RandomGenerator.alphaNumeric(12),
    } satisfies IRedditCommunityMember.ICreate,
  });
  typia.assert(member);

  // Step 2: Create a community post that will be moderated
  const postTitle = RandomGenerator.paragraph({ sentences: 3 });
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

  // Step 3: Create a content report to trigger moderation action
  const report =
    await api.functional.redditCommunity.member.contentReports.create(
      connection,
      {
        body: {
          report_reason:
            "This post violates community guidelines by promoting spam content",
          report_category: "spam",
          content_type: "post",
          post_id: post.id,
        } satisfies IRedditCommunityContentReport.ICreate,
      },
    );
  typia.assert(report);

  // Step 4: Create appeal against the moderation action
  const appealRationale = RandomGenerator.paragraph({
    sentences: 8,
    wordMin: 15,
    wordMax: 25,
  });
  const supportingEvidence = RandomGenerator.content({
    paragraphs: 3,
    sentenceMin: 5,
    sentenceMax: 10,
    wordMin: 8,
    wordMax: 15,
  });

  const appeal = await api.functional.redditCommunity.member.appeals.create(
    connection,
    {
      body: {
        rationale: appealRationale,
        requested_remedy: "full_reversal",
        supporting_evidence: supportingEvidence,
      } satisfies IRedditCommunityAppeal.ICreate,
    },
  );
  typia.assert(appeal);

  // Step 5: Validate appeal creation and properties
  TestValidator.equals(
    "appeal status should be submitted",
    appeal.status,
    "submitted",
  );
  TestValidator.equals(
    "appeal business status",
    appeal.business_status,
    "filed",
  );
  TestValidator.equals(
    "appeal request remedy",
    appeal.requested_remedy,
    "full_reversal",
  );
  TestValidator.equals(
    "appeal rationale matches",
    appeal.rationale,
    appealRationale,
  );
  TestValidator.equals(
    "appeal supporting evidence",
    appeal.supporting_evidence,
    supportingEvidence,
  );

  // Validate appellant information
  TestValidator.equals("appeal appellant id", appeal.appellant.id, member.id);
  TestValidator.equals(
    "appeal appellant nickname",
    appeal.appellant.nickname,
    memberNickname,
  );

  // Validate timestamps
  TestValidator.predicate(
    "appeal created at is valid string",
    () => typeof appeal.created_at === "string",
  );
  TestValidator.predicate(
    "appeal appealed at is valid string",
    () => typeof appeal.appealed_at === "string",
  );
  TestValidator.predicate(
    "appeal decision should be null",
    () => appeal.decision === null,
  );
  TestValidator.predicate(
    "appeal responded at should be null",
    () => appeal.responded_at === null,
  );
}
