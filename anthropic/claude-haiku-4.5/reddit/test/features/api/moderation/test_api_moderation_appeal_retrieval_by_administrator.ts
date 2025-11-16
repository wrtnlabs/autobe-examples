import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformModerationAppeal } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationAppeal";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReport";
import type { ICommunityPlatformReportDecision } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportDecision";

export async function test_api_moderation_appeal_retrieval_by_administrator(
  connection: api.IConnection,
) {
  // Step 1: Create member account who will submit the appeal
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        username: RandomGenerator.name(1),
        password: "TestPassword123!",
        href: "https://test.example.com",
        referrer: "https://test.example.com",
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(member);

  // Step 2: Create moderator account to make moderation decision
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator: ICommunityPlatformModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        username: RandomGenerator.name(1),
        password: "TestPassword123!",
        href: "https://test.example.com",
        referrer: "https://test.example.com",
      } satisfies ICommunityPlatformModerator.ICreate,
    });
  typia.assert(moderator);

  // Step 3: Create a post that will be reported
  await api.functional.auth.member.login(connection, {
    body: {
      email: memberEmail,
      password: "TestPassword123!",
      href: "https://test.example.com",
      referrer: "https://test.example.com",
    } satisfies ICommunityPlatformMember.ILogin,
  });

  const post: ICommunityPlatformPost =
    await api.functional.communityPlatform.member.posts.create(connection, {
      body: {
        community_id: typia.random<string & tags.Format<"uuid">>(),
        post_type: "text",
        title: RandomGenerator.paragraph({ sentences: 3 }),
        content_text: RandomGenerator.content({ paragraphs: 2 }),
      } satisfies ICommunityPlatformPost.ICreate,
    });
  typia.assert(post);

  // Step 4: Submit a report on the post
  const report: ICommunityPlatformReport =
    await api.functional.communityPlatform.member.reports.create(connection, {
      body: {
        reported_post_id: post.id,
        category: "harassment",
        additional_details: RandomGenerator.paragraph({ sentences: 2 }),
        reporter_contact_email: memberEmail,
      } satisfies ICommunityPlatformReport.ICreate,
    });
  typia.assert(report);

  // Step 5: Switch to moderator and create moderation decision
  await api.functional.auth.moderator.login(connection, {
    body: {
      email: moderatorEmail,
      password: "TestPassword123!",
      href: "https://test.example.com",
      referrer: "https://test.example.com",
    } satisfies ICommunityPlatformModerator.ILogin,
  });

  const decision: ICommunityPlatformReportDecision =
    await api.functional.communityPlatform.moderator.reports.decision.create(
      connection,
      {
        reportId: report.id,
        body: {
          action_type: "remove_content",
          reason:
            "The post violates community harassment policy and contains personal attacks",
          internal_notes: "Escalated due to multiple similar reports",
        } satisfies ICommunityPlatformReportDecision.ICreate,
      },
    );
  typia.assert(decision);

  // Step 6: Switch back to member and submit appeal
  await api.functional.auth.member.login(connection, {
    body: {
      email: memberEmail,
      password: "TestPassword123!",
      href: "https://test.example.com",
      referrer: "https://test.example.com",
    } satisfies ICommunityPlatformMember.ILogin,
  });

  const appeal: ICommunityPlatformModerationAppeal =
    await api.functional.communityPlatform.member.moderationAppeals.create(
      connection,
      {
        body: {
          community_platform_report_decision_id: decision.id,
          appeal_reason: RandomGenerator.paragraph({
            sentences: 8,
            wordMin: 5,
            wordMax: 10,
          }),
          supporting_evidence: "https://example.com/evidence",
        } satisfies ICommunityPlatformModerationAppeal.ICreate,
      },
    );
  typia.assert(appeal);

  // Step 7: Create administrator account and authenticate
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin: ICommunityPlatformAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: adminEmail,
        password: "TestPassword123!",
        username: RandomGenerator.name(1),
        name: RandomGenerator.name(2),
        href: "https://test.example.com",
        referrer: "https://test.example.com",
      } satisfies ICommunityPlatformAdministrator.ICreate,
    });
  typia.assert(admin);

  // Step 8: Administrator retrieves the appeal by ID
  const retrievedAppeal: ICommunityPlatformModerationAppeal =
    await api.functional.communityPlatform.administrator.moderationAppeals.at(
      connection,
      {
        appealId: appeal.id,
      },
    );
  typia.assert(retrievedAppeal);

  // Step 9: Validate appeal details
  TestValidator.equals("appeal ID matches", retrievedAppeal.id, appeal.id);

  TestValidator.equals(
    "appeal reason matches",
    retrievedAppeal.appeal_reason,
    appeal.appeal_reason,
  );

  TestValidator.equals(
    "appeal status is submitted",
    retrievedAppeal.appeal_status,
    "submitted",
  );

  TestValidator.equals(
    "appellant member ID matches",
    retrievedAppeal.community_platform_member_id,
    member.id,
  );

  TestValidator.equals(
    "decision reference matches",
    retrievedAppeal.community_platform_report_decision_id,
    decision.id,
  );

  // Verify appellant information is populated
  TestValidator.predicate(
    "appellant summary is present",
    retrievedAppeal.appellant !== null &&
      retrievedAppeal.appellant !== undefined,
  );

  TestValidator.equals(
    "appellant ID in summary matches",
    retrievedAppeal.appellant.id,
    member.id,
  );

  // Verify decision information is populated
  TestValidator.predicate(
    "decision summary is present",
    retrievedAppeal.decision !== null && retrievedAppeal.decision !== undefined,
  );

  TestValidator.equals(
    "decision ID in summary matches",
    retrievedAppeal.decision.id,
    decision.id,
  );

  TestValidator.equals(
    "decision action type matches",
    retrievedAppeal.decision.action_type,
    "remove_content",
  );

  // Verify reviewer is initially null for submitted appeals
  TestValidator.predicate(
    "reviewer is null for submitted appeal",
    retrievedAppeal.reviewer === null || retrievedAppeal.reviewer === undefined,
  );

  // Verify timestamps are in ISO 8601 format
  TestValidator.predicate(
    "submitted_at is valid ISO 8601 date",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?$/.test(
      retrievedAppeal.submitted_at,
    ),
  );

  TestValidator.predicate(
    "created_at is valid ISO 8601 date",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?$/.test(
      retrievedAppeal.created_at,
    ),
  );

  TestValidator.predicate(
    "updated_at is valid ISO 8601 date",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?$/.test(
      retrievedAppeal.updated_at,
    ),
  );
}
