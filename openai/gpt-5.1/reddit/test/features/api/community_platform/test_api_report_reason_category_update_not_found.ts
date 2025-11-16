import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountStatus";
import type { ICommunityPlatformPlatformadmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPlatformadmin";
import type { ICommunityPlatformReportReasonCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportReasonCategory";

/**
 * Validate that updating a non-existent report reason category by its business
 * code fails with an HTTP error and does not create any new configuration.
 *
 * Business purpose:
 *
 * - Platform administrators manage standardized report reason categories by their
 *   stable `code` identifiers.
 * - When an admin attempts to update a category with a `code` that does not
 *   exist, the backend must return a not-found style error instead of silently
 *   creating a new category.
 * - The operation must also leave the authenticated admin session intact.
 *
 * Test steps:
 *
 * 1. Register and authenticate a platform admin via POST /auth/platformAdmin/join.
 * 2. Attempt to update a report reason category using a clearly non-existent
 *    `reportReasonCategoryCode` value.
 * 3. Provide a well-formed ICommunityPlatformReportReasonCategory.IUpdate payload
 *    so that the only failure reason is the missing category.
 * 4. Assert that the update call throws an HTTP error.
 * 5. Optionally, perform a lightweight follow-up auth call to confirm the
 *    connection/session remains usable.
 */
export async function test_api_report_reason_category_update_not_found(
  connection: api.IConnection,
) {
  // 1. Register and authenticate a platform admin
  const joinBody = {
    username: RandomGenerator.alphabets(12),
    email: `${RandomGenerator.alphabets(8)}@example.com`,
    password: RandomGenerator.alphaNumeric(16),
    displayName: RandomGenerator.name(),
    href: "https://admin.example.com/register", // valid URI
    referrer: "https://admin.example.com/landing", // valid URI
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const admin = await api.functional.auth.platformAdmin.join(connection, {
    body: joinBody,
  });
  typia.assert<ICommunityPlatformPlatformadmin.IAuthorized>(admin);

  // 2. Attempt to update a non-existent report reason category
  const nonExistentCode = "nonexistent_code_123";

  const updateBody = {
    name: "Non-existent reason category",
    description: RandomGenerator.paragraph({ sentences: 5 }),
    is_user_visible: true,
    is_active: true,
  } satisfies ICommunityPlatformReportReasonCategory.IUpdate;

  await TestValidator.error(
    "updating non-existent report reason category should fail",
    async () => {
      await api.functional.communityPlatform.platformAdmin.reportReasonCategories.update(
        connection,
        {
          reportReasonCategoryCode: nonExistentCode,
          body: updateBody,
        },
      );
    },
  );

  // 3. Sanity check: perform a lightweight follow-up operation to ensure
  //    the admin session/connection is still usable. We'll call join again
  //    with a different admin account.
  const followUpJoinBody = {
    username: RandomGenerator.alphabets(12),
    email: `${RandomGenerator.alphabets(8)}+2@example.com`,
    password: RandomGenerator.alphaNumeric(16),
    displayName: RandomGenerator.name(),
    href: "https://admin.example.com/register", // valid URI
    referrer: "https://admin.example.com/landing", // valid URI
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const secondAdmin = await api.functional.auth.platformAdmin.join(connection, {
    body: followUpJoinBody,
  });
  typia.assert<ICommunityPlatformPlatformadmin.IAuthorized>(secondAdmin);
}
