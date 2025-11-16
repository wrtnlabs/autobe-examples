import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountStatus";
import type { ICommunityPlatformPlatformadmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPlatformadmin";
import type { ICommunityPlatformReportReasonCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportReasonCategory";

/**
 * Basic happy-path and regression test for deleting a report reason category by
 * its business code as a platform administrator.
 *
 * Business workflow validated by this test:
 *
 * 1. Register a new platform administrator account via auth.platformAdmin.join.
 *    This both creates the admin row and attaches a JWT access token to the
 *    connection, enabling subsequent platformAdmin-scoped calls.
 * 2. As that authenticated admin, create a new report reason category using a
 *    unique `code` plus name/description and visibility flags. The response
 *    must be a fully-hydrated ICommunityPlatformReportReasonCategory object
 *    whose `code` matches the request.
 * 3. Call the DELETE reportReasonCategories.erase endpoint with the same
 *    `reportReasonCategoryCode`, expecting a successful void response (the SDK
 *    models this as Promise<void>, so the absence of an exception is sufficient
 *    to treat the deletion as successful).
 * 4. Attempt to delete the same `code` again and assert that an error is thrown,
 *    proving that the category is no longer present/usable by its business
 *    identifier.
 *
 * Due to the limited API surface provided in this context (no index/detail
 * endpoint for categories), this test uses the second-delete failure as the
 * canonical signal that the category has been removed, instead of verifying via
 * a listing or detail read.
 */
export async function test_api_report_reason_category_delete_basic_flow(
  connection: api.IConnection,
) {
  // 1. Register a new platform administrator and obtain an authenticated connection.
  const joinBody = {
    username: `admin_${RandomGenerator.alphaNumeric(8)}`,
    email: `${RandomGenerator.alphaNumeric(8)}@example.com`,
    password: RandomGenerator.alphaNumeric(16),
    displayName: RandomGenerator.name(),
    href: "https://admin.console.example.com/register",
    referrer: "https://admin.console.example.com/",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const admin = await api.functional.auth.platformAdmin.join(connection, {
    body: joinBody,
  });
  typia.assert(admin);

  // 2. Create a new report reason category with a unique business code.
  const categoryCode = `spam_to_delete_${RandomGenerator.alphaNumeric(8)}`;

  const createBody = {
    code: categoryCode,
    name: "Spam to delete",
    description: RandomGenerator.paragraph({ sentences: 6 }),
    is_user_visible: true,
    is_active: true,
  } satisfies ICommunityPlatformReportReasonCategory.ICreate;

  const createdCategory =
    await api.functional.communityPlatform.platformAdmin.reportReasonCategories.create(
      connection,
      { body: createBody },
    );
  typia.assert(createdCategory);

  // Validate that created category uses the requested business code.
  TestValidator.equals(
    "created report reason category code must match request",
    createdCategory.code,
    categoryCode,
  );

  // 3. Delete the category by its code. Void response; expect no exception.
  await api.functional.communityPlatform.platformAdmin.reportReasonCategories.erase(
    connection,
    { reportReasonCategoryCode: categoryCode },
  );

  // 4. Attempt to delete the same category again and assert an error occurs.
  await TestValidator.error(
    "second deletion of same report reason category code must fail",
    async () => {
      await api.functional.communityPlatform.platformAdmin.reportReasonCategories.erase(
        connection,
        { reportReasonCategoryCode: categoryCode },
      );
    },
  );
}
