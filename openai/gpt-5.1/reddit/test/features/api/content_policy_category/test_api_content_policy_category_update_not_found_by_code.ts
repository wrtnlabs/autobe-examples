import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountStatus";
import type { ICommunityPlatformContentPolicyCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformContentPolicyCategory";
import type { ICommunityPlatformPlatformadmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPlatformadmin";

export async function test_api_content_policy_category_update_not_found_by_code(
  connection: api.IConnection,
) {
  // 1. Join as platform admin to obtain authenticated context
  const admin: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: {
        username: "admin_not_found_tester",
        email: "admin.not.found.tester@example.com",
        password: "password-1234",
        displayName: "Admin NotFound Tester",
        href: "https://admin.example.com/join",
        referrer: "https://admin.example.com/landing",
      } satisfies ICommunityPlatformPlatformadmin.IJoin,
    });
  typia.assert(admin);

  // 2. Prepare a clearly non-existent category code
  const missingCode = "non_existent_policy_code";

  // 3. Attempt to update the non-existent category and assert error
  await TestValidator.error(
    "updating non-existent content policy category must fail",
    async () => {
      await api.functional.communityPlatform.platformAdmin.contentPolicyCategories.update(
        connection,
        {
          contentPolicyCategoryCode: missingCode,
          body: {
            name: "Updated Name For Missing Category",
            description: "Attempt to update a category that should not exist.",
            isActive: true,
            isDefault: false,
          } satisfies ICommunityPlatformContentPolicyCategory.IUpdate,
        },
      );
    },
  );
}
