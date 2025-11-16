import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountStatus";
import type { ICommunityPlatformPlatformadmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPlatformadmin";

/**
 * Verify that deleting a non-existent content policy category by its business
 * code as a platform administrator results in an error rather than a silent
 * success.
 *
 * Business context: Platform administrators manage global content policy
 * categories that are referenced throughout the moderation and reporting
 * system. When an admin attempts to delete a category that does not exist (for
 * example, due to a typo or an already-removed code), the API must clearly
 * signal that no such category exists instead of behaving like a successful
 * deletion. This helps prevent confusion in admin tooling and ensures that
 * operators can distinguish between actual deletions and no-op requests.
 *
 * Test flow:
 *
 * 1. Register and authenticate a fresh platform admin with POST
 *    /auth/platformAdmin/join using a random but valid join payload
 *    (ICommunityPlatformPlatformadmin.IJoin). This call also configures the
 *    connection with the proper Authorization header via the SDK.
 * 2. Generate a random category business code string that is extremely unlikely to
 *    exist in the catalog (e.g., a long random alphanumeric identifier).
 *    Because this test never creates any real categories, any such random code
 *    will effectively represent a non-existent category.
 * 3. Invoke DELETE
 *    /communityPlatform/platformAdmin/contentPolicyCategories/{contentPolicyCategoryCode}
 *    via
 *    api.functional.communityPlatform.platformAdmin.contentPolicyCategories.erase
 *    using the random code as the contentPolicyCategoryCode path parameter.
 * 4. Use TestValidator.error to assert that the erase call throws an error rather
 *    than succeeding. The SDK throws HttpError for non-2xx responses; for this
 *    test we only care that some HttpError is raised when the category does not
 *    exist, not the exact status code or error payload.
 */
export async function test_api_content_policy_category_deletion_not_found(
  connection: api.IConnection,
) {
  // 1. Join as a new platform admin to obtain an authenticated connection
  const joinBody = {
    username: RandomGenerator.alphaNumeric(12),
    email: `admin_${RandomGenerator.alphaNumeric(8)}@example.com`,
    password: RandomGenerator.alphaNumeric(16),
    displayName: RandomGenerator.name(),
    href: "https://admin.example.com/register",
    referrer: "https://admin.example.com/",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const admin: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: joinBody,
    });
  typia.assert(admin);

  // 2. Prepare a non-existent content policy category code
  const nonExistentCode: string = `nonexistent-${RandomGenerator.alphaNumeric(24)}`;

  // 3 & 4. Attempt to delete the non-existent category and assert it fails
  await TestValidator.error(
    "deleting non-existent content policy category should throw",
    async () => {
      await api.functional.communityPlatform.platformAdmin.contentPolicyCategories.erase(
        connection,
        {
          contentPolicyCategoryCode: nonExistentCode,
        },
      );
    },
  );
}
