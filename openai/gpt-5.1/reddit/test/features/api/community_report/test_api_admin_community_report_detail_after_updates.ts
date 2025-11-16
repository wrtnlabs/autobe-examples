import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdminUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminUserJoin";
import type { ICommunityPlatformAdminUserLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminUserLogin";
import type { ICommunityPlatformAdminuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminuser";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityReport";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";
import type { ICommunityPlatformModerationCase } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationCase";

export async function test_api_admin_community_report_detail_after_updates(
  connection: api.IConnection,
) {
  // 1. Prepare unique identifiers and URLs for auth flows
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const memberEmail: string = typia.random<string & tags.Format<"email">>();
  const adminUsername: string = RandomGenerator.name(1);
  const memberUsername: string = RandomGenerator.name(1);
  const adminPassword: string = "Admin#" + RandomGenerator.alphaNumeric(12);
  const memberPassword: string = "Member#" + RandomGenerator.alphaNumeric(12);
  const href: string = "https://community.example.com/auth";
  const referrer: string = "https://community.example.com/landing";

  // 2. Create and authenticate an adminUser via join
  const adminJoinBody = {
    username: adminUsername,
    email: adminEmail,
    password: adminPassword,
  } satisfies ICommunityPlatformAdminUserJoin.IRequest;

  const adminAuthorizedFromJoin: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorizedFromJoin);

  // 3. Create and authenticate a memberUser via join
  const memberJoinBody = {
    username: memberUsername as string & tags.MinLength<3> & tags.MaxLength<32>,
    email: memberEmail as string & tags.Format<"email">,
    password: ("Pass#" + RandomGenerator.alphaNumeric(10)) as string &
      tags.MinLength<8>,
    ip: null,
    href: href as string & tags.Format<"uri">,
    referrer: referrer as string & tags.Format<"uri">,
  } satisfies ICommunityPlatformMemberuser.IJoin;

  const memberAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorized);

  // 4. As memberUser, create a community
  const communityCreateBody = {
    slug: RandomGenerator.alphaNumeric(12) as string &
      tags.MinLength<1> &
      tags.MaxLength<128>,
    name: RandomGenerator.paragraph({ sentences: 2 }) as string &
      tags.MinLength<1> &
      tags.MaxLength<255>,
    description: RandomGenerator.paragraph({
      sentences: 5,
      wordMin: 3,
      wordMax: 10,
    }),
    visibility: "public",
    status: "active",
    is_nsfw: false,
    is_quarantined: false,
    is_posting_restricted: false,
    allow_text_posts: true,
    allow_link_posts: true,
    allow_image_posts: true,
  } satisfies ICommunityPlatformCommunity.ICreate;

  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      {
        body: communityCreateBody,
      },
    );
  typia.assert(community);

  // 5. As same memberUser, create a community-level report
  const reportCreateBody = {
    community_id: community.id,
    reason_category: "abuse",
    reason_detail: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies ICommunityPlatformCommunityReport.ICreate;

  const createdReport: ICommunityPlatformCommunityReport =
    await api.functional.communityPlatform.memberUser.communityReports.create(
      connection,
      {
        body: reportCreateBody,
      },
    );
  typia.assert(createdReport);

  // 6. Switch back to adminUser context via login (ensures fresh token)
  const adminLoginBody = {
    identifier: adminEmail,
    password: adminPassword,
    ip: null,
    href: href as string & tags.Format<"uri">,
    referrer: referrer as string & tags.Format<"uri">,
  } satisfies ICommunityPlatformAdminUserLogin.IRequest;

  const adminAuthorizedFromLogin: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminAuthorizedFromLogin);

  // 7. As adminUser, retrieve the report detail
  const adminViewReport: ICommunityPlatformCommunityReport =
    await api.functional.communityPlatform.adminUser.communityReports.at(
      connection,
      {
        communityReportId: createdReport.id,
      },
    );
  typia.assert(adminViewReport);

  // 8. Basic identity and linkage checks
  TestValidator.equals(
    "admin view report id should match created report id",
    adminViewReport.id,
    createdReport.id,
  );

  TestValidator.equals(
    "admin view community_id should match created community_id",
    adminViewReport.community_id,
    createdReport.community_id,
  );

  TestValidator.equals(
    "admin view community_id should match community.id",
    adminViewReport.community_id,
    community.id,
  );

  // 9. Nested community summary consistency when present
  if (adminViewReport.community !== undefined) {
    TestValidator.equals(
      "nested community summary id matches community_id",
      adminViewReport.community.id,
      adminViewReport.community_id,
    );
    TestValidator.equals(
      "nested community summary slug matches created community slug",
      adminViewReport.community.slug,
      community.slug,
    );
    TestValidator.equals(
      "nested community summary name matches created community name",
      adminViewReport.community.name,
      community.name,
    );
  }

  // 10. Reporter member linkage when present
  if (
    adminViewReport.reporter_memberuser_id !== null &&
    adminViewReport.reporter_memberuser_id !== undefined
  ) {
    TestValidator.equals(
      "reporter_memberuser_id should match member user id",
      adminViewReport.reporter_memberuser_id,
      memberAuthorized.id,
    );

    if (
      adminViewReport.reporter_member !== null &&
      adminViewReport.reporter_member !== undefined
    ) {
      TestValidator.equals(
        "nested reporter_member summary id matches reporter_memberuser_id",
        adminViewReport.reporter_member.id,
        adminViewReport.reporter_memberuser_id,
      );
    }
  }

  // 11. Reporter/admin and assigned_admin linkage consistency if present
  if (
    adminViewReport.reporter_adminuser_id !== null &&
    adminViewReport.reporter_adminuser_id !== undefined &&
    adminViewReport.reporter_admin !== null &&
    adminViewReport.reporter_admin !== undefined
  ) {
    TestValidator.equals(
      "reporter_admin summary id should match reporter_adminuser_id",
      adminViewReport.reporter_admin.id,
      adminViewReport.reporter_adminuser_id,
    );
  }

  if (
    adminViewReport.assigned_adminuser_id !== null &&
    adminViewReport.assigned_adminuser_id !== undefined &&
    adminViewReport.assigned_admin !== null &&
    adminViewReport.assigned_admin !== undefined
  ) {
    TestValidator.equals(
      "assigned_admin summary id should match assigned_adminuser_id",
      adminViewReport.assigned_admin.id,
      adminViewReport.assigned_adminuser_id,
    );
  }

  // 12. Moderation case linkage consistency if present
  if (
    adminViewReport.moderation_case_id !== null &&
    adminViewReport.moderation_case_id !== undefined &&
    adminViewReport.moderation_case !== null &&
    adminViewReport.moderation_case !== undefined
  ) {
    TestValidator.equals(
      "moderation_case summary id should match moderation_case_id",
      adminViewReport.moderation_case.id,
      adminViewReport.moderation_case_id,
    );
  }

  // 13. Status and severity basic sanity (non-empty strings)
  TestValidator.predicate(
    "status should be a non-empty string",
    adminViewReport.status.length > 0,
  );
  TestValidator.predicate(
    "severity should be a non-empty string",
    adminViewReport.severity.length > 0,
  );

  // 14. Timestamps: created_at <= updated_at
  const createdAtMillis: number = new Date(
    adminViewReport.created_at,
  ).getTime();
  const updatedAtMillis: number = new Date(
    adminViewReport.updated_at,
  ).getTime();
  TestValidator.predicate(
    "created_at must be less than or equal to updated_at",
    createdAtMillis <= updatedAtMillis,
  );

  // 15. Second fetch should be consistent with the first admin view
  const adminViewReportAgain: ICommunityPlatformCommunityReport =
    await api.functional.communityPlatform.adminUser.communityReports.at(
      connection,
      {
        communityReportId: createdReport.id,
      },
    );
  typia.assert(adminViewReportAgain);

  TestValidator.equals(
    "second admin view of report should equal first admin view",
    adminViewReportAgain,
    adminViewReport,
  );
}
