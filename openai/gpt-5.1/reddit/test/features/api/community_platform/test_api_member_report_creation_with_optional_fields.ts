import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountStatus";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityVisibilityLevel } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityVisibilityLevel";
import type { ICommunityPlatformGuestuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformGuestuser";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";
import type { ICommunityPlatformPlatformadmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPlatformadmin";
import type { ICommunityPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReport";
import type { ICommunityPlatformReportReasonCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportReasonCategory";

/**
 * Validate member report creation with all optional fields and linkage.
 *
 * Business context:
 *
 * - A platform administrator maintains the catalog of report reason categories.
 * - A member user participates in communities and may file moderation reports
 *   against content or behavior, optionally providing community context,
 *   severity, and a free-text description.
 *
 * This test verifies the happy-path workflow where a member user creates a
 * report with all enrichable optional fields supplied, and ensures that these
 * fields are fully persisted and reflected in the returned
 * ICommunityPlatformReport.
 *
 * Scenario steps:
 *
 * 1. Register a platformAdmin actor and obtain authorized context.
 * 2. As platformAdmin, create a report reason category to be used by the member.
 * 3. Register a memberUser actor and obtain authorized context.
 * 4. As memberUser, create a community to serve as the context_community for the
 *    report.
 * 5. As the same memberUser, create a report with:
 *
 *    - Reporter_type = "member" (consistent with authenticated actor),
 *    - Report_reason_category_id set to the created category id,
 *    - Community_id set to the created community id,
 *    - Severity set to a non-null string such as "high",
 *    - Description filled with descriptive text.
 * 6. Validate that the returned ICommunityPlatformReport:
 *
 *    - Echoes reporter_type, severity, and description,
 *    - Initializes status and timestamps (created_at, updated_at),
 *    - Has resolved_at unset (null/undefined) on creation,
 *    - Populates reason_category with the correct category id,
 *    - Populates context_community with the correct community id.
 */
export async function test_api_member_report_creation_with_optional_fields(
  connection: api.IConnection,
) {
  // 1. Register platform admin and get authorized context
  const platformAdminJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: "AdminPass!123",
    displayName: RandomGenerator.name(),
    ip: undefined,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const platformAdminAuthorized: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinBody,
    });
  typia.assert(platformAdminAuthorized);

  // 2. As platformAdmin, create a report reason category
  const reasonCategoryCreateBody = {
    code: `test_reason_${RandomGenerator.alphaNumeric(8)}`,
    name: "Test Reason Category",
    description: RandomGenerator.paragraph({ sentences: 5 }),
    is_user_visible: true,
    is_active: true,
  } satisfies ICommunityPlatformReportReasonCategory.ICreate;

  const createdReasonCategory: ICommunityPlatformReportReasonCategory =
    await api.functional.communityPlatform.platformAdmin.reportReasonCategories.create(
      connection,
      { body: reasonCategoryCreateBody },
    );
  typia.assert(createdReasonCategory);

  // 3. Register member user and get authorized context
  const memberJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: "MemberPass!123",
    ip: undefined,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  const memberAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorized);

  // 4. As memberUser, create a community
  const communityCreateBody = {
    identifier: `test-community-${RandomGenerator.alphaNumeric(8)}`,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.paragraph({ sentences: 6 }),
    visibilityLevelCode: "public",
    isNsfw: false,
    primaryTagIds: undefined,
  } satisfies ICommunityPlatformCommunity.ICreate;

  const createdCommunity: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      { body: communityCreateBody },
    );
  typia.assert(createdCommunity);

  // 5. As the same memberUser, create a report with all optional fields filled
  const reporterType = "member";
  const severity = "high";
  const description = RandomGenerator.content({ paragraphs: 2 });

  const reportCreateBody = {
    reporter_type: reporterType,
    report_reason_category_id: createdReasonCategory.id,
    community_id: createdCommunity.id,
    severity,
    description,
  } satisfies ICommunityPlatformReport.ICreate;

  const createdReport: ICommunityPlatformReport =
    await api.functional.communityPlatform.memberUser.reports.create(
      connection,
      { body: reportCreateBody },
    );
  typia.assert(createdReport);

  // 6. Business validations
  // 6-1. Core echo fields
  TestValidator.equals(
    "reporter_type should match input",
    createdReport.reporter_type,
    reporterType,
  );

  TestValidator.equals(
    "severity should match input",
    createdReport.severity,
    severity,
  );

  TestValidator.equals(
    "description should match input",
    createdReport.description,
    description,
  );

  // 6-2. Status and timestamps
  TestValidator.predicate(
    "status should be a non-empty string",
    typeof createdReport.status === "string" && createdReport.status.length > 0,
  );

  TestValidator.predicate(
    "created_at should be a non-empty string",
    typeof createdReport.created_at === "string" &&
      createdReport.created_at.length > 0,
  );

  TestValidator.predicate(
    "updated_at should be a non-empty string",
    typeof createdReport.updated_at === "string" &&
      createdReport.updated_at.length > 0,
  );

  TestValidator.predicate(
    "resolved_at should be null or undefined on creation",
    createdReport.resolved_at === null ||
      createdReport.resolved_at === undefined,
  );

  // 6-3. Linkage to reason category
  TestValidator.predicate(
    "reason_category should be populated",
    createdReport.reason_category !== undefined &&
      createdReport.reason_category !== null,
  );

  if (
    createdReport.reason_category !== undefined &&
    createdReport.reason_category !== null
  ) {
    TestValidator.equals(
      "reason_category.id should match created category id",
      createdReport.reason_category.id,
      createdReasonCategory.id,
    );
  }

  // 6-4. Linkage to context community
  TestValidator.predicate(
    "context_community should be populated",
    createdReport.context_community !== undefined &&
      createdReport.context_community !== null,
  );

  if (
    createdReport.context_community !== undefined &&
    createdReport.context_community !== null
  ) {
    TestValidator.equals(
      "context_community.id should match created community id",
      createdReport.context_community.id,
      createdCommunity.id,
    );
  }
}
