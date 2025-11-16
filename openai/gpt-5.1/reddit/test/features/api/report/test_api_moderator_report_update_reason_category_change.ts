import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountStatus";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityModerator";
import type { ICommunityPlatformGuestuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformGuestuser";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";
import type { ICommunityPlatformPlatformadmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPlatformadmin";
import type { ICommunityPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReport";
import type { ICommunityPlatformReportReasonCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportReasonCategory";

/**
 * Validate that a community moderator can reclassify an existing report by
 * changing its report_reason_category_id and that the change is reflected both
 * in the immediate update response and in subsequent admin read operations.
 *
 * End-to-end business flow:
 *
 * 1. Platform admin joins and becomes authenticated.
 * 2. Platform admin creates two distinct report reason categories (initial and
 *    alternative).
 * 3. Member user joins and becomes authenticated.
 * 4. Member user creates a report using the initial reason category.
 * 5. Community moderator joins and becomes authenticated.
 * 6. Community moderator updates the report, changing only the
 *    report_reason_category_id to the alternative category.
 * 7. Verify the update response's reason_category reflects the new category.
 * 8. Switch back to platform admin (login) and fetch the report via the admin read
 *    endpoint.
 * 9. Verify the fetched report's reason_category also reflects the new category,
 *    confirming persistence and referential integrity.
 */
export async function test_api_moderator_report_update_reason_category_change(
  connection: api.IConnection,
) {
  // 1. Platform admin joins (registers) and becomes authenticated
  const platformAdminJoinBody = {
    username: RandomGenerator.alphabets(12),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    displayName: RandomGenerator.name(),
    ip: "127.0.0.1",
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const platformAdminAuthorized: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinBody,
    });
  typia.assert(platformAdminAuthorized);

  // 2. Platform admin creates two report reason categories
  const initialCategoryBody = {
    code: `reason_${RandomGenerator.alphabets(8)}`,
    name: "Initial Reason Category",
    description: RandomGenerator.paragraph({ sentences: 6 }),
    is_user_visible: true,
    is_active: true,
  } satisfies ICommunityPlatformReportReasonCategory.ICreate;

  const initialCategory: ICommunityPlatformReportReasonCategory =
    await api.functional.communityPlatform.platformAdmin.reportReasonCategories.create(
      connection,
      { body: initialCategoryBody },
    );
  typia.assert(initialCategory);

  const alternativeCategoryBody = {
    code: `reason_${RandomGenerator.alphabets(8)}`,
    name: "Alternative Reason Category",
    description: RandomGenerator.paragraph({ sentences: 6 }),
    is_user_visible: true,
    is_active: true,
  } satisfies ICommunityPlatformReportReasonCategory.ICreate;

  const alternativeCategory: ICommunityPlatformReportReasonCategory =
    await api.functional.communityPlatform.platformAdmin.reportReasonCategories.create(
      connection,
      { body: alternativeCategoryBody },
    );
  typia.assert(alternativeCategory);

  TestValidator.notEquals(
    "initial and alternative report reason categories must differ",
    initialCategory.id,
    alternativeCategory.id,
  );

  // 3. Member user joins and becomes authenticated
  const memberJoinBody = {
    username: RandomGenerator.alphabets(10),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    ip: "127.0.0.1",
    href: "https://community.example.com/join",
    referrer: "https://community.example.com/home",
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  const memberAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorized);

  // 4. Member user creates a report using the initial reason category
  const reportCreateBody = {
    reporter_type: "member",
    report_reason_category_id: initialCategory.id,
    community_id: null,
    severity: null,
    description: RandomGenerator.paragraph({ sentences: 8 }),
  } satisfies ICommunityPlatformReport.ICreate;

  const createdReport: ICommunityPlatformReport =
    await api.functional.communityPlatform.memberUser.reports.create(
      connection,
      { body: reportCreateBody },
    );
  typia.assert(createdReport);

  TestValidator.equals(
    "created report should use initial reason category in summary",
    createdReport.reason_category?.id ?? null,
    initialCategory.id,
  );

  // 5. Community moderator joins and becomes authenticated
  const moderatorJoinBody = {
    username: RandomGenerator.alphabets(10),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    display_name: RandomGenerator.name(),
    ip: "127.0.0.1",
    href: "https://moderator.example.com/join",
    referrer: "https://moderator.example.com/landing",
  } satisfies ICommunityPlatformCommunityModerator.IJoin;

  const moderatorAuthorized: ICommunityPlatformCommunityModerator.IAuthorized =
    await api.functional.auth.communityModerator.join(connection, {
      body: moderatorJoinBody,
    });
  typia.assert(moderatorAuthorized);

  // 6. Community moderator updates the report, changing only the reason category
  const updateBody = {
    report_reason_category_id: alternativeCategory.id,
  } satisfies ICommunityPlatformReport.IUpdate;

  const updatedReport: ICommunityPlatformReport =
    await api.functional.communityPlatform.communityModerator.reports.update(
      connection,
      {
        reportId: createdReport.id,
        body: updateBody,
      },
    );
  typia.assert(updatedReport);

  TestValidator.equals(
    "updated report's reason_category id should be alternative category id",
    updatedReport.reason_category?.id ?? null,
    alternativeCategory.id,
  );

  TestValidator.notEquals(
    "updated report's reason_category id should differ from initial category id",
    updatedReport.reason_category?.id ?? null,
    initialCategory.id,
  );

  // 7. Switch back to platform admin by logging in (explicit login flow)
  const platformAdminLoginBody = {
    identifier: platformAdminJoinBody.email,
    password: platformAdminJoinBody.password,
    ip: "127.0.0.1",
    href: "https://admin.example.com/login",
    referrer: "https://admin.example.com/landing",
  } satisfies ICommunityPlatformPlatformadmin.ILogin;

  const platformAdminLoginAuthorized: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: platformAdminLoginBody,
    });
  typia.assert(platformAdminLoginAuthorized);

  // 8. Admin fetches the report via GET /communityPlatform/platformAdmin/reports/{reportId}
  const fetchedReport: ICommunityPlatformReport =
    await api.functional.communityPlatform.platformAdmin.reports.at(
      connection,
      { reportId: createdReport.id as string & tags.Format<"uuid"> },
    );
  typia.assert(fetchedReport);

  // 9. Validate that the fetched report reflects the new reason category
  TestValidator.equals(
    "fetched report's reason_category id should match alternative category id",
    fetchedReport.reason_category?.id ?? null,
    alternativeCategory.id,
  );

  TestValidator.notEquals(
    "fetched report's reason_category id should not match initial category id",
    fetchedReport.reason_category?.id ?? null,
    initialCategory.id,
  );

  // Cross-check consistency between updated moderator view and admin view
  TestValidator.equals(
    "updated and fetched reports should share the same reason_category id",
    updatedReport.reason_category?.id ?? null,
    fetchedReport.reason_category?.id ?? null,
  );
}
