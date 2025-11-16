import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountStatus";
import type { ICommunityPlatformContentPolicyCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformContentPolicyCategory";
import type { ICommunityPlatformPlatformadmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPlatformadmin";

/**
 * Validate that deleting a content policy category requires platform admin
 * authentication and that unauthorized deletion attempts do not affect stored
 * categories.
 *
 * Business flow:
 *
 * 1. Register and authenticate a platform admin using POST
 *    /auth/platformAdmin/join.
 * 2. As that admin, create a content policy category via POST
 *    /communityPlatform/platformAdmin/contentPolicyCategories.
 * 3. Clone the base connection to produce an unauthenticated connection (empty
 *    headers).
 * 4. Attempt to delete the created category using the unauthenticated connection
 *    and expect an error.
 * 5. With the original authenticated connection, attempt to create another
 *    category with the same `code` and expect a duplicate error, proving the
 *    category was not deleted.
 */
export async function test_api_content_policy_category_deletion_requires_authentication(
  connection: api.IConnection,
) {
  // 1. Register and authenticate a platform admin
  const joinBody = {
    username: RandomGenerator.alphabets(12),
    email: `${RandomGenerator.alphabets(8)}@example.com`,
    password: RandomGenerator.alphaNumeric(16),
    displayName: RandomGenerator.name(),
    href: "https://admin-console.example.com/register",
    referrer: "https://admin-console.example.com/landing",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const admin = await api.functional.auth.platformAdmin.join(connection, {
    body: joinBody,
  });
  typia.assert<ICommunityPlatformPlatformadmin.IAuthorized>(admin);

  // 2. Create a content policy category as the authenticated admin
  const categoryCode = `test_auth_${RandomGenerator.alphaNumeric(8)}`;
  const createBody = {
    code: categoryCode,
    name: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    isActive: true,
    isDefault: false,
  } satisfies ICommunityPlatformContentPolicyCategory.ICreate;

  const createdCategory =
    await api.functional.communityPlatform.platformAdmin.contentPolicyCategories.create(
      connection,
      { body: createBody },
    );
  typia.assert<ICommunityPlatformContentPolicyCategory>(createdCategory);

  // 3. Build an unauthenticated connection (no headers)
  const unauthConn: api.IConnection = { ...connection, headers: {} };

  // 4. Attempt to delete the category without authentication and expect an error
  await TestValidator.error("unauthenticated delete must fail", async () => {
    await api.functional.communityPlatform.platformAdmin.contentPolicyCategories.erase(
      unauthConn,
      { contentPolicyCategoryCode: categoryCode },
    );
  });

  // 5. Using the authenticated connection, attempt to create another category
  //    with the same code and expect a duplicate error. This indicates the
  //    original category still exists and was not deleted.
  await TestValidator.error(
    "duplicate category code after failed unauthorized delete must fail",
    async () => {
      await api.functional.communityPlatform.platformAdmin.contentPolicyCategories.create(
        connection,
        { body: createBody },
      );
    },
  );
}
