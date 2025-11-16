import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountStatus";
import type { ICommunityPlatformPlatformadmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPlatformadmin";

/**
 * Validate that attempting to delete a non-existent report reason category by
 * its business code as an authenticated platform admin results in a not-found
 * style error without any observable side effects.
 *
 * Business intent: Platform administrators manage the catalog of report reason
 * categories used throughout the community. When an admin attempts to delete a
 * category by a code that does not exist in
 * `community_platform_report_reason_categories`, the system must surface an
 * error rather than silently succeeding.
 *
 * Scope of this test (based on available SDK operations):
 *
 * 1. Provision and authenticate a platform admin account via POST
 *    /auth/platformAdmin/join. This both creates the admin row and establishes
 *    an authenticated session by setting Authorization header with the issued
 *    JWT access token.
 * 2. Invoke DELETE
 *    /communityPlatform/platformAdmin/reportReasonCategories/{reportReasonCategoryCode}
 *    through
 *    `api.functional.communityPlatform.platformAdmin.reportReasonCategories.erase`
 *    using a clearly non-existent `reportReasonCategoryCode` value.
 * 3. Assert, via `TestValidator.error`, that the delete attempt throws an error
 *    (HttpError from the SDK) for this non-existent code, representing a
 *    not-found style condition.
 *
 * Limitations:
 *
 * - The provided SDK surface does not include creation or listing APIs for report
 *   reason categories, so this test cannot directly assert that no new records
 *   were created or that a particular pre-existing set of categories remains
 *   unchanged.
 * - For the same reason, we cannot validate side effects in the
 *   `community_platform_report_reason_categories` table and must treat the
 *   error behavior itself as the primary contract.
 * - Per global guidance, this test must NOT assert specific HTTP status codes
 *   (like 404) or error messages; it only verifies that an error is thrown when
 *   deleting a non-existent category.
 *
 * Steps implemented:
 *
 * 1. Build a realistic `ICommunityPlatformPlatformadmin.IJoin` payload using
 *    `typia.random` and small overrides for readability.
 * 2. Call `api.functional.auth.platformAdmin.join` with that payload to obtain an
 *    `ICommunityPlatformPlatformadmin.IAuthorized` object and implicitly set
 *    the Authorization header on the `connection` via the SDK (without touching
 *    `connection.headers` directly in test code).
 * 3. Choose a fixed, obviously non-existent `reportReasonCategoryCode` string such
 *    as "nonexistent_delete_code_123".
 * 4. Wrap the erase call in `await TestValidator.error` with a descriptive title
 *    to assert that an error is thrown for this non-existent code.
 */
export async function test_api_report_reason_category_delete_not_found(
  connection: api.IConnection,
) {
  // 1. Join as a platform admin to obtain Authorization context.
  const joinBody = typia.random<ICommunityPlatformPlatformadmin.IJoin>();

  const admin: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: joinBody,
    });
  typia.assert(admin);

  // 2. Attempt to delete a clearly non-existent report reason category code.
  const nonExistentCode = "nonexistent_delete_code_123";

  await TestValidator.error(
    "delete non-existent report reason category should fail",
    async () => {
      await api.functional.communityPlatform.platformAdmin.reportReasonCategories.erase(
        connection,
        {
          reportReasonCategoryCode: nonExistentCode,
        },
      );
    },
  );
}
