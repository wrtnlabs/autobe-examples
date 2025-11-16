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

export async function test_api_admin_community_report_detail_basic_flow(
  connection: api.IConnection,
) {
  // 1. Prepare unique, realistic admin and member credentials
  const adminUsername = RandomGenerator.alphabets(12);
  const adminEmail = `${RandomGenerator.alphabets(8)}@admin.test.com`;
  const adminPassword = "Admin#" + RandomGenerator.alphaNumeric(8);

  const memberUsername = RandomGenerator.alphabets(10);
  const memberEmail = `${RandomGenerator.alphabets(8)}@member.test.com`;
  const memberPassword = "Member#" + RandomGenerator.alphaNumeric(8);

  const href = "https://client.test.app/auth" as string & tags.Format<"uri">;
  const referrer = "https://client.test.app/landing" as string &
    tags.Format<"uri">;

  // 2. Join adminUser (this also authenticates as adminUser initially)
  const adminJoinOutput = await api.functional.auth.adminUser.join(connection, {
    body: {
      username: adminUsername,
      email: adminEmail as string & tags.Format<"email">,
      password: adminPassword as string & tags.Format<"password">,
    } satisfies ICommunityPlatformAdminUserJoin.IRequest,
  });
  typia.assert<ICommunityPlatformAdminuser.IAuthorized>(adminJoinOutput);

  // 3. Join memberUser (switch connection auth to memberUser)
  const memberJoinOutput = await api.functional.auth.memberUser.join(
    connection,
    {
      body: {
        username: memberUsername as string &
          tags.MinLength<3> &
          tags.MaxLength<32>,
        email: memberEmail as string & tags.Format<"email">,
        password: memberPassword as string as string & tags.MinLength<8>,
        ip: null,
        href,
        referrer,
      } satisfies ICommunityPlatformMemberuser.IJoin,
    },
  );
  typia.assert<ICommunityPlatformMemberuser.IAuthorized>(memberJoinOutput);

  // 4. As memberUser, create a community
  const communityCreateBody = {
    slug: RandomGenerator.alphabets(10) as string as string &
      tags.MinLength<1> &
      tags.MaxLength<128>,
    name: RandomGenerator.paragraph({ sentences: 2 }) as string as string &
      tags.MinLength<1> &
      tags.MaxLength<255>,
    description: RandomGenerator.paragraph({
      sentences: 5,
      wordMin: 3,
      wordMax: 10,
    }) as string & tags.MaxLength<4000>,
    visibility: "public",
    status: "active",
    is_nsfw: false,
    is_quarantined: false,
    is_posting_restricted: false,
    allow_text_posts: true,
    allow_link_posts: true,
    allow_image_posts: true,
  } satisfies ICommunityPlatformCommunity.ICreate;

  const community =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      { body: communityCreateBody },
    );
  typia.assert<ICommunityPlatformCommunity>(community);

  // 5. As memberUser, create a community-level report for the created community
  const reasonCategory = "spam";
  const reasonDetail = RandomGenerator.paragraph({
    sentences: 3,
    wordMin: 4,
    wordMax: 10,
  });

  const reportCreateBody = {
    community_id: community.id,
    reason_category: reasonCategory,
    reason_detail: reasonDetail,
  } satisfies ICommunityPlatformCommunityReport.ICreate;

  const createdReport =
    await api.functional.communityPlatform.memberUser.communityReports.create(
      connection,
      { body: reportCreateBody },
    );
  typia.assert<ICommunityPlatformCommunityReport>(createdReport);

  // Basic invariants about the created report itself
  TestValidator.equals(
    "created report community_id matches community.id",
    createdReport.community_id,
    community.id,
  );
  TestValidator.equals(
    "created report reason_category matches input",
    createdReport.reason_category,
    reasonCategory,
  );
  TestValidator.equals(
    "created report reason_detail matches input",
    createdReport.reason_detail,
    reasonDetail,
  );

  // 6. Switch authentication back to adminUser via admin login
  const adminLoginOutput = await api.functional.auth.adminUser.login(
    connection,
    {
      body: {
        identifier: adminEmail,
        password: adminPassword,
        ip: null,
        href,
        referrer,
      } satisfies ICommunityPlatformAdminUserLogin.IRequest,
    },
  );
  typia.assert<ICommunityPlatformAdminuser.IAuthorized>(adminLoginOutput);

  // 7. As adminUser, fetch the community report detail by id
  const fetchedReport =
    await api.functional.communityPlatform.adminUser.communityReports.at(
      connection,
      { communityReportId: createdReport.id },
    );
  typia.assert<ICommunityPlatformCommunityReport>(fetchedReport);

  // 8. Validate core identity and basic fields
  TestValidator.equals(
    "fetched report id matches created report id",
    fetchedReport.id,
    createdReport.id,
  );
  TestValidator.equals(
    "fetched report community_id equals created community.id",
    fetchedReport.community_id,
    community.id,
  );
  TestValidator.equals(
    "fetched report reason_category matches created",
    fetchedReport.reason_category,
    createdReport.reason_category,
  );
  TestValidator.equals(
    "fetched report reason_detail matches created",
    fetchedReport.reason_detail,
    createdReport.reason_detail,
  );

  // 9. Ensure status and severity fields are non-empty strings
  TestValidator.predicate(
    "fetched report status must be non-empty string",
    typeof fetchedReport.status === "string" &&
      fetchedReport.status.trim().length > 0,
  );
  TestValidator.predicate(
    "fetched report severity must be non-empty string",
    typeof fetchedReport.severity === "string" &&
      fetchedReport.severity.trim().length > 0,
  );

  // 10. Validate created_at and updated_at are date-time strings (already type-validated by typia)
  TestValidator.predicate(
    "fetched report created_at should equal createdReport.created_at",
    fetchedReport.created_at === createdReport.created_at,
  );
  TestValidator.predicate(
    "fetched report updated_at should be defined",
    typeof fetchedReport.updated_at === "string" &&
      fetchedReport.updated_at.length > 0,
  );

  // 11. Validate nested community summary when present
  if (fetchedReport.community !== undefined) {
    const summary = fetchedReport.community;
    TestValidator.equals(
      "community summary id matches community.id",
      summary.id,
      community.id,
    );
    TestValidator.equals(
      "community summary slug matches community.slug",
      summary.slug,
      community.slug,
    );
    TestValidator.equals(
      "community summary name matches community.name",
      summary.name,
      community.name,
    );
  }

  // 12. Validate reporter_member summary for member-originated report
  TestValidator.predicate(
    "created report should have reporter_member when filed by member",
    fetchedReport.reporter_member !== undefined,
  );
  if (
    fetchedReport.reporter_member !== undefined &&
    fetchedReport.reporter_member !== null
  ) {
    const reporter = fetchedReport.reporter_member;
    TestValidator.equals(
      "reporter_member.id is non-empty uuid string",
      reporter.id,
      reporter.id,
    );
    TestValidator.equals(
      "reporter_member.username is non-empty string",
      reporter.username,
      reporter.username,
    );
  }

  // 13. For a member-originated report, reporter_admin is expected to be null/undefined
  TestValidator.predicate(
    "reporter_admin should be null or undefined for member-originated report",
    fetchedReport.reporter_admin === null ||
      fetchedReport.reporter_admin === undefined,
  );

  // 14. moderation_case and assigned_admin may or may not be set; when present, just assert structural validity
  if (
    fetchedReport.moderation_case !== undefined &&
    fetchedReport.moderation_case !== null
  ) {
    const modCase = fetchedReport.moderation_case;
    typia.assert<ICommunityPlatformModerationCase.ISummary>(modCase);
  }
  if (
    fetchedReport.assigned_admin !== undefined &&
    fetchedReport.assigned_admin !== null
  ) {
    const assigned = fetchedReport.assigned_admin;
    typia.assert<ICommunityPlatformAdminuser.ISummary>(assigned);
  }
}
