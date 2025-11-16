import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountStatus";
import type { ICommunityPlatformPlatformadmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPlatformadmin";
import type { ICommunityPlatformReportReasonCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportReasonCategory";

/**
 * Verify that report reason category detail endpoint enforces platform admin
 * authentication.
 *
 * Business purpose:
 *
 * - Ensure
 *   /communityPlatform/platformAdmin/reportReasonCategories/{reportReasonCategoryCode}
 *   cannot be accessed without a valid platformAdmin session.
 * - Confirm that once a platformAdmin is authenticated and a category exists, the
 *   same detail endpoint works correctly when called with proper auth.
 *
 * Scenario steps:
 *
 * 1. Join as a platform administrator using POST /auth/platformAdmin/join.
 * 2. While authenticated, create a new report reason category via POST
 *    /communityPlatform/platformAdmin/reportReasonCategories and capture its
 *    code.
 * 3. Build an unauthenticated connection (with empty headers) and call the detail
 *    endpoint using that code; expect the call to fail.
 * 4. Call the same detail endpoint again using the original authenticated
 *    connection; expect success and verify the code matches the created one.
 */
export async function test_api_report_reason_category_detail_requires_platform_admin_auth(
  connection: api.IConnection,
) {
  // 1. Join as platform admin and obtain authorized context
  const joinBody = {
    username: RandomGenerator.alphabets(12),
    email: `${RandomGenerator.alphabets(8)}@example.com`,
    password: RandomGenerator.alphabets(16),
    displayName: RandomGenerator.name(),
    href: "https://admin.example.com/register",
    referrer: "https://admin.example.com/landing",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const platformAdmin = await api.functional.auth.platformAdmin.join(
    connection,
    {
      body: joinBody,
    },
  );
  typia.assert<ICommunityPlatformPlatformadmin.IAuthorized>(platformAdmin);

  // 2. Create a new report reason category as this platform admin
  const categoryBody = {
    code: `code_${RandomGenerator.alphabets(8)}`,
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.content({
      paragraphs: 1,
      sentenceMin: 3,
      sentenceMax: 6,
    }),
    is_user_visible: true,
    is_active: true,
  } satisfies ICommunityPlatformReportReasonCategory.ICreate;

  const createdCategory =
    await api.functional.communityPlatform.platformAdmin.reportReasonCategories.create(
      connection,
      {
        body: categoryBody,
      },
    );
  typia.assert<ICommunityPlatformReportReasonCategory>(createdCategory);

  // 3. Build an unauthenticated connection (no Authorization header)
  const unauthConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  // 4. Call detail endpoint without auth and expect failure
  await TestValidator.error(
    "unauthenticated detail access must fail",
    async () => {
      await api.functional.communityPlatform.platformAdmin.reportReasonCategories.at(
        unauthConnection,
        {
          reportReasonCategoryCode: createdCategory.code,
        },
      );
    },
  );

  // 5. Call detail endpoint with valid platform admin auth and expect success
  const detail =
    await api.functional.communityPlatform.platformAdmin.reportReasonCategories.at(
      connection,
      {
        reportReasonCategoryCode: createdCategory.code,
      },
    );
  typia.assert<ICommunityPlatformReportReasonCategory>(detail);

  // Verify that the retrieved category matches the created one by code
  TestValidator.equals(
    "detail category code must match created category code",
    detail.code,
    createdCategory.code,
  );
}
