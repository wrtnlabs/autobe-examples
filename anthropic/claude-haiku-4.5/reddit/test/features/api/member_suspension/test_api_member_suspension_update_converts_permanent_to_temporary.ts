import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformMemberSuspension } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberSuspension";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReport";
import type { ICommunityPlatformReportDecision } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportDecision";

export async function test_api_member_suspension_update_converts_permanent_to_temporary(
  connection: api.IConnection,
) {
  // Step 1: Create administrator account for suspension management
  const administratorEmail = typia.random<string & tags.Format<"email">>();
  const administratorPassword = RandomGenerator.alphaNumeric(12);
  const administrator: ICommunityPlatformAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: administratorEmail,
        password: administratorPassword,
        username: RandomGenerator.alphaNumeric(10),
        name: RandomGenerator.name(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ICommunityPlatformAdministrator.ICreate,
    });
  typia.assert(administrator);

  // Step 2: Create moderator account for violation reporting
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorPassword = RandomGenerator.alphaNumeric(12);
  const moderator: ICommunityPlatformModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        password: moderatorPassword,
        username: RandomGenerator.alphaNumeric(10),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ICommunityPlatformModerator.ICreate,
    });
  typia.assert(moderator);

  // Step 3: Create member account for suspension
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = RandomGenerator.alphaNumeric(12);
  const member: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        username: RandomGenerator.alphaNumeric(10),
        password: memberPassword,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(member);

  // Step 4: Create post for violation report
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

  // Step 5: Create violation report
  const report: ICommunityPlatformReport =
    await api.functional.communityPlatform.member.reports.create(connection, {
      body: {
        reported_post_id: post.id,
        category: "harassment",
        additional_details: RandomGenerator.paragraph({ sentences: 4 }),
        reporter_contact_email: memberEmail,
      } satisfies ICommunityPlatformReport.ICreate,
    });
  typia.assert(report);

  // Step 6: Switch to moderator and create decision with suspension
  await api.functional.auth.moderator.login(connection, {
    body: {
      email: moderatorEmail,
      password: moderatorPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ICommunityPlatformModerator.ILogin,
  });

  const decision: ICommunityPlatformReportDecision =
    await api.functional.communityPlatform.moderator.reports.decision.create(
      connection,
      {
        reportId: report.id,
        body: {
          action_type: "suspend_user",
          reason:
            "Violation of community harassment policy with repeated offenses",
          suspension_duration_days: 30,
        } satisfies ICommunityPlatformReportDecision.ICreate,
      },
    );
  typia.assert(decision);

  // Step 7: Switch to administrator and create permanent suspension
  await api.functional.auth.administrator.login(connection, {
    body: {
      email: administratorEmail,
      password: administratorPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ICommunityPlatformAdministrator.ILogin,
  });

  const permanentSuspension: ICommunityPlatformMemberSuspension =
    await api.functional.communityPlatform.administrator.memberSuspensions.create(
      connection,
      {
        body: {
          community_platform_member_id: member.id,
          community_platform_report_decision_id: decision.id,
          suspension_reason: RandomGenerator.paragraph({
            sentences: 5,
            wordMin: 4,
            wordMax: 8,
          }),
          suspended_at: new Date().toISOString(),
          expires_at: null,
        } satisfies ICommunityPlatformMemberSuspension.ICreate,
      },
    );
  typia.assert(permanentSuspension);

  // Verify permanent suspension has null expires_at
  TestValidator.predicate(
    "permanent suspension should have null expires_at",
    permanentSuspension.expires_at === null,
  );

  // Step 8: Convert permanent suspension to temporary by updating expires_at
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + 7); // 7 days from now
  const futureDateISO = futureDate.toISOString();

  const temporarySuspension: ICommunityPlatformMemberSuspension =
    await api.functional.communityPlatform.administrator.memberSuspensions.update(
      connection,
      {
        suspensionId: permanentSuspension.id,
        body: {
          expires_at: futureDateISO,
        } satisfies ICommunityPlatformMemberSuspension.IUpdate,
      },
    );
  typia.assert(temporarySuspension);

  // Step 9: Validate suspension conversion from permanent to temporary
  TestValidator.predicate(
    "expires_at should no longer be null",
    temporarySuspension.expires_at !== null &&
      temporarySuspension.expires_at !== undefined,
  );

  TestValidator.equals(
    "expires_at should match the updated future date",
    temporarySuspension.expires_at,
    futureDateISO,
  );

  TestValidator.predicate(
    "expiration date should be after suspension start",
    () => {
      const expiresTime = new Date(temporarySuspension.expires_at!).getTime();
      const suspendedTime = new Date(
        temporarySuspension.suspended_at,
      ).getTime();
      return expiresTime > suspendedTime;
    },
  );

  TestValidator.predicate("updated_at should reflect the modification", () => {
    const updatedTime = new Date(temporarySuspension.updated_at).getTime();
    const suspendedTime = new Date(temporarySuspension.suspended_at).getTime();
    return updatedTime >= suspendedTime;
  });

  TestValidator.equals(
    "suspension ID should remain unchanged",
    temporarySuspension.id,
    permanentSuspension.id,
  );

  TestValidator.equals(
    "member ID should remain unchanged",
    temporarySuspension.community_platform_member_id,
    permanentSuspension.community_platform_member_id,
  );

  TestValidator.equals(
    "decision ID should remain unchanged",
    temporarySuspension.community_platform_report_decision_id,
    permanentSuspension.community_platform_report_decision_id,
  );
}
