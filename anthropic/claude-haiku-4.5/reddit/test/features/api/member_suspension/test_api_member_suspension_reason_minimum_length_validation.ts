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

export async function test_api_member_suspension_reason_minimum_length_validation(
  connection: api.IConnection,
) {
  // Step 1: Create administrator account for testing suspension reason validation
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(12);
  const administrator: ICommunityPlatformAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        username: RandomGenerator.alphabets(8),
        name: RandomGenerator.name(),
        href: "http://localhost:3000",
        referrer: "http://localhost:3000",
      } satisfies ICommunityPlatformAdministrator.ICreate,
    });
  typia.assert(administrator);

  // Step 2: Create member account to test suspension creation
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = RandomGenerator.alphaNumeric(12);
  const member: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        username: RandomGenerator.alphabets(8),
        password: memberPassword,
        href: "http://localhost:3000",
        referrer: "http://localhost:3000",
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(member);

  // Step 3: Create moderator account for making moderation decisions
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorPassword = RandomGenerator.alphaNumeric(12);
  const moderator: ICommunityPlatformModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        username: RandomGenerator.alphabets(8),
        password: moderatorPassword,
        href: "http://localhost:3000",
        referrer: "http://localhost:3000",
      } satisfies ICommunityPlatformModerator.ICreate,
    });
  typia.assert(moderator);

  // Helper function to create a report and decision for suspension testing
  const createReportAndDecision = async (
    moderatorConn: api.IConnection,
    memberConn: api.IConnection,
  ): Promise<{
    report: ICommunityPlatformReport;
    decision: ICommunityPlatformReportDecision;
  }> => {
    // Create a post as violation content
    const post: ICommunityPlatformPost =
      await api.functional.communityPlatform.member.posts.create(memberConn, {
        body: {
          community_id: typia.random<string & tags.Format<"uuid">>(),
          post_type: "text",
          title: RandomGenerator.paragraph({ sentences: 2 }),
          content_text: RandomGenerator.content({ paragraphs: 2 }),
        } satisfies ICommunityPlatformPost.ICreate,
      });
    typia.assert(post);

    // File violation report on the post
    const report: ICommunityPlatformReport =
      await api.functional.communityPlatform.member.reports.create(memberConn, {
        body: {
          reported_post_id: post.id,
          category: "harassment",
          additional_details: RandomGenerator.paragraph({ sentences: 2 }),
          reporter_contact_email: memberEmail,
        } satisfies ICommunityPlatformReport.ICreate,
      });
    typia.assert(report);

    // Create moderation decision for the report
    const decision: ICommunityPlatformReportDecision =
      await api.functional.communityPlatform.moderator.reports.decision.create(
        moderatorConn,
        {
          reportId: report.id,
          body: {
            action_type: "suspend_user",
            reason: RandomGenerator.paragraph({ sentences: 5 }),
            suspension_duration_days: 7,
          } satisfies ICommunityPlatformReportDecision.ICreate,
        },
      );
    typia.assert(decision);

    return { report, decision };
  };

  // Step 4: Create first report and decision for testing 19-character reason
  const memberConn: api.IConnection = { ...connection, headers: {} };
  await api.functional.auth.member.login(memberConn, {
    body: {
      email: memberEmail,
      password: memberPassword,
      href: "http://localhost:3000",
      referrer: "http://localhost:3000",
    } satisfies ICommunityPlatformMember.ILogin,
  });

  const moderatorConn: api.IConnection = { ...connection, headers: {} };
  await api.functional.auth.moderator.login(moderatorConn, {
    body: {
      email: moderatorEmail,
      password: moderatorPassword,
      href: "http://localhost:3000",
      referrer: "http://localhost:3000",
    } satisfies ICommunityPlatformModerator.ILogin,
  });

  const { decision: decision1 } = await createReportAndDecision(
    moderatorConn,
    memberConn,
  );

  // Switch to administrator context for suspension creation
  const adminConn: api.IConnection = { ...connection, headers: {} };
  await api.functional.auth.administrator.login(adminConn, {
    body: {
      email: adminEmail,
      password: adminPassword,
      href: "http://localhost:3000",
      referrer: "http://localhost:3000",
    } satisfies ICommunityPlatformAdministrator.ILogin,
  });

  // Step 5: Test suspension_reason with 19 characters (below minimum - should fail)
  const reasonBelowMinimum = RandomGenerator.alphabets(19);
  await TestValidator.error(
    "suspension_reason with 19 characters should be rejected",
    async () => {
      await api.functional.communityPlatform.administrator.memberSuspensions.create(
        adminConn,
        {
          body: {
            community_platform_member_id: member.id,
            community_platform_report_decision_id: decision1.id,
            suspension_reason: reasonBelowMinimum,
            suspended_at: new Date().toISOString(),
            expires_at: new Date(
              Date.now() + 7 * 24 * 60 * 60 * 1000,
            ).toISOString(),
          } satisfies ICommunityPlatformMemberSuspension.ICreate,
        },
      );
    },
  );

  // Step 6: Create second report and decision for testing 20-character reason
  const { decision: decision2 } = await createReportAndDecision(
    moderatorConn,
    memberConn,
  );

  // Step 7: Test suspension_reason with exactly 20 characters (at boundary - should succeed)
  const reasonAtMinimum = RandomGenerator.alphabets(20);
  const suspensionAtMinimum: ICommunityPlatformMemberSuspension =
    await api.functional.communityPlatform.administrator.memberSuspensions.create(
      adminConn,
      {
        body: {
          community_platform_member_id: member.id,
          community_platform_report_decision_id: decision2.id,
          suspension_reason: reasonAtMinimum,
          suspended_at: new Date().toISOString(),
          expires_at: new Date(
            Date.now() + 7 * 24 * 60 * 60 * 1000,
          ).toISOString(),
        } satisfies ICommunityPlatformMemberSuspension.ICreate,
      },
    );
  typia.assert(suspensionAtMinimum);
  TestValidator.equals(
    "suspension_reason at 20 characters should be accepted",
    suspensionAtMinimum.suspension_reason,
    reasonAtMinimum,
  );

  // Step 8: Create third report and decision for testing 25-character reason
  const { decision: decision3 } = await createReportAndDecision(
    moderatorConn,
    memberConn,
  );

  // Step 9: Test suspension_reason with 25 characters (above minimum - should succeed and not be truncated)
  const reasonAboveMinimum = RandomGenerator.alphabets(25);
  const suspensionAboveMinimum: ICommunityPlatformMemberSuspension =
    await api.functional.communityPlatform.administrator.memberSuspensions.create(
      adminConn,
      {
        body: {
          community_platform_member_id: member.id,
          community_platform_report_decision_id: decision3.id,
          suspension_reason: reasonAboveMinimum,
          suspended_at: new Date().toISOString(),
          expires_at: new Date(
            Date.now() + 7 * 24 * 60 * 60 * 1000,
          ).toISOString(),
        } satisfies ICommunityPlatformMemberSuspension.ICreate,
      },
    );
  typia.assert(suspensionAboveMinimum);
  TestValidator.equals(
    "suspension_reason with 25 characters should be accepted without truncation",
    suspensionAboveMinimum.suspension_reason,
    reasonAboveMinimum,
  );
}
