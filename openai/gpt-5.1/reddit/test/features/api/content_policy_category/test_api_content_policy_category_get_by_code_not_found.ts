import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountStatus";
import type { ICommunityPlatformContentPolicyCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformContentPolicyCategory";
import type { ICommunityPlatformPlatformadmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPlatformadmin";

export async function test_api_content_policy_category_get_by_code_not_found(
  connection: api.IConnection,
) {
  // 1. Register and authenticate a platform admin so we can create categories
  const joinBody = typia.random<ICommunityPlatformPlatformadmin.IJoin>();
  const platformAdmin = await api.functional.auth.platformAdmin.join(
    connection,
    {
      body: joinBody,
    },
  );
  typia.assert<ICommunityPlatformPlatformadmin.IAuthorized>(platformAdmin);

  // 2. Create a valid content policy category via platformAdmin endpoint
  const createBody =
    typia.random<ICommunityPlatformContentPolicyCategory.ICreate>();
  const createdCategory =
    await api.functional.communityPlatform.platformAdmin.contentPolicyCategories.create(
      connection,
      {
        body: createBody,
      },
    );
  typia.assert<ICommunityPlatformContentPolicyCategory>(createdCategory);

  // 3. Call public GET with a clearly non-existent code and expect 404
  const nonExistingCode = "non_existing_category_code_9999";
  await TestValidator.httpError(
    "get non-existing content policy category returns 404",
    404,
    async () => {
      await api.functional.communityPlatform.contentPolicyCategories.at(
        connection,
        {
          contentPolicyCategoryCode: nonExistingCode,
        },
      );
    },
  );

  // 4. Confirm existing category remains retrievable by its real code
  const reloadedCategory =
    await api.functional.communityPlatform.contentPolicyCategories.at(
      connection,
      {
        contentPolicyCategoryCode: createdCategory.code,
      },
    );
  typia.assert<ICommunityPlatformContentPolicyCategory>(reloadedCategory);

  TestValidator.equals(
    "created category code should match reloaded category code",
    reloadedCategory.code,
    createdCategory.code,
  );
}
