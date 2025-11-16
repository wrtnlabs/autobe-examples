import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountStatus";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformGuestuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformGuestuser";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";
import type { ICommunityPlatformPlatformadmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPlatformadmin";
import type { ICommunityPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReport";
import type { ICommunityPlatformReportReasonCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportReasonCategory";

/**
 * Validate member report creation behavior when using an inactive report reason
 * category.
 *
 * Business goal
 *
 * - Ensure that the moderation/reporting subsystem enforces the is_active flag on
 *   report reason categories at the moment a member user creates a report.
 * - When a category has been deactivated by a platform admin, new reports from
 *   member users must not be allowed to reference that category.
 *
 * Scenario outline
 *
 * 1. Platform admin bootstrap and authentication
 *
 *    - Call /auth/platformAdmin/join with a realistic payload to create a new
 *         platformAdmin actor and establish an authenticated context.
 *    - Rely on the SDK behavior that sets connection.headers.Authorization from the
 *         returned token so subsequent platformAdmin calls are authenticated.
 * 2. Create an active report reason category
 *
 *    - As the platformAdmin, call POST
 *         /communityPlatform/platformAdmin/reportReasonCategories with a body
 *         that satisfies ICommunityPlatformReportReasonCategory.ICreate.
 *    - Use a stable, human-readable code (e.g. "inactive_category_test") and set
 *         is_active=true and is_user_visible=true so that the category is a
 *         normal, user-facing category initially.
 *    - Assert the returned ICommunityPlatformReportReasonCategory with typia.assert
 *         and keep both the id (UUID) and code for later use.
 * 3. Deactivate the report reason category
 *
 *    - Still under the platformAdmin session, call PUT
 *         /communityPlatform/platformAdmin/reportReasonCategories/{code} using
 *         the code returned from step 2 as reportReasonCategoryCode.
 *    - Provide a body that satisfies ICommunityPlatformReportReasonCategory.IUpdate
 *         with is_active set to false (and optionally tweak name/description).
 *    - Assert the updated category, and verify through TestValidator that is_active
 *         has changed from true to false.
 * 4. Member user bootstrap and authentication
 *
 *    - Call /auth/memberUser/join with a valid
 *         ICommunityPlatformMemberuser.IJoinRequest payload to create a member
 *         user and simultaneously obtain
 *         ICommunityPlatformMemberuser.IAuthorized.
 *    - The SDK will switch Authorization to the memberUser token so subsequent calls
 *         execute in the member context.
 * 5. Attempt to create a report using the inactive category
 *
 *    - As the authenticated memberUser, call POST
 *         /communityPlatform/memberUser/reports with a body satisfying
 *         ICommunityPlatformReport.ICreate:
 *
 *         - Reporter_type: value representing a member actor (e.g., "member").
 *         - Report_reason_category_id: the UUID id from the category created in step 2
 *                   (which has now been deactivated in step 3).
 *         - Provide optional fields severity and description with reasonable strings.
 *    - According to the ICommunityPlatformReport.ICreate description, the backend
 *         "rejects requests that reference non-existent or inactive
 *         categories". Therefore, this call is expected to fail at runtime.
 *    - Use await TestValidator.error with an async callback that performs the
 *         reports.create call, and do not attempt to inspect HTTP status codes
 *         or error messages—only assert that an error was thrown.
 * 6. Assertions and invariants
 *
 *    - Typia.assert on all successful DTO responses:
 *
 *         - PlatformAdmin join (IAuthorized)
 *         - Report reason category create (ICommunityPlatformReportReasonCategory)
 *         - Report reason category update (ICommunityPlatformReportReasonCategory)
 *         - MemberUser join (IAuthorized)
 *    - TestValidator.equals to confirm that the same category id/code is used before
 *         and after the update, and that is_active transitioned from true to
 *         false.
 *    - Use realistic random data helpers (RandomGenerator, typia.random with
 *         tags.Format<"email"> and tags.Format<"uri">) for required fields.
 *
 * Implementation notes
 *
 * - Do not touch connection.headers directly; rely on the auth SDK functions to
 *   manage Authorization tokens when switching between platformAdmin and
 *   memberUser actors.
 * - Use only the provided API functions and DTOs; do not assume additional
 *   endpoints or properties.
 * - Ensure every async API call is awaited, including inside the
 *   TestValidator.error async callback.
 */
export async function test_api_member_report_creation_with_inactive_reason_category(
  connection: api.IConnection,
) {
  // 1. Platform admin joins (auth + token)
  const adminJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    displayName: RandomGenerator.name(),
    ip: "127.0.0.1",
    href: "https://admin-console.example.com/join",
    referrer: "https://admin-console.example.com/landing",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const adminAuthorized: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert<ICommunityPlatformPlatformadmin.IAuthorized>(adminAuthorized);

  // 2. Create an active report reason category
  const categoryCode = `inactive_category_${RandomGenerator.alphaNumeric(8)}`;

  const createCategoryBody = {
    code: categoryCode,
    name: "Inactive Category Test",
    description: RandomGenerator.paragraph({ sentences: 5 }),
    is_user_visible: true,
    is_active: true,
  } satisfies ICommunityPlatformReportReasonCategory.ICreate;

  const createdCategory: ICommunityPlatformReportReasonCategory =
    await api.functional.communityPlatform.platformAdmin.reportReasonCategories.create(
      connection,
      {
        body: createCategoryBody,
      },
    );
  typia.assert<ICommunityPlatformReportReasonCategory>(createdCategory);

  TestValidator.equals(
    "created category code should match request",
    createdCategory.code,
    categoryCode,
  );
  TestValidator.predicate(
    "created category should be active",
    createdCategory.is_active === true,
  );

  // 3. Deactivate the report reason category
  const updateCategoryBody = {
    // Optionally adjust name/description to prove update path works
    name: `${createdCategory.name} (inactive)`,
    description: createdCategory.description,
    is_user_visible: createdCategory.is_user_visible,
    is_active: false,
  } satisfies ICommunityPlatformReportReasonCategory.IUpdate;

  const updatedCategory: ICommunityPlatformReportReasonCategory =
    await api.functional.communityPlatform.platformAdmin.reportReasonCategories.update(
      connection,
      {
        reportReasonCategoryCode: createdCategory.code,
        body: updateCategoryBody,
      },
    );
  typia.assert<ICommunityPlatformReportReasonCategory>(updatedCategory);

  TestValidator.equals(
    "updated category id should equal created category id",
    updatedCategory.id,
    createdCategory.id,
  );
  TestValidator.equals(
    "updated category code should remain unchanged",
    updatedCategory.code,
    createdCategory.code,
  );
  TestValidator.predicate(
    "updated category should be inactive",
    updatedCategory.is_active === false,
  );

  // 4. Member user joins (auth + token)
  const memberJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    ip: "203.0.113.10",
    href: "https://community.example.com/signup",
    referrer: "https://community.example.com/home",
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  const memberAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert<ICommunityPlatformMemberuser.IAuthorized>(memberAuthorized);

  // 5. Attempt to create a report using the now-inactive category
  const reportCreateBody = {
    reporter_type: "member",
    report_reason_category_id: createdCategory.id,
    community_id: null,
    severity: "low",
    description: RandomGenerator.paragraph({ sentences: 6 }),
  } satisfies ICommunityPlatformReport.ICreate;

  await TestValidator.error(
    "creating report with inactive category should fail",
    async () => {
      await api.functional.communityPlatform.memberUser.reports.create(
        connection,
        {
          body: reportCreateBody,
        },
      );
    },
  );
}
