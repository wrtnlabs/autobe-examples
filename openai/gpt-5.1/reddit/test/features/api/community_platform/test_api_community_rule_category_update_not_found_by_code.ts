import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountStatus";
import type { ICommunityPlatformCommunityRuleCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityRuleCategory";
import type { ICommunityPlatformPlatformadmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPlatformadmin";

/**
 * Verify that updating a community rule category by a non-existent business
 * code fails with an error while using a valid platformAdmin session and a
 * syntactically valid update payload.
 *
 * Business context:
 *
 * - Community rule categories are global taxonomy entries identified externally
 *   by a stable `code` field rather than their database `id`.
 * - Platform administrators manage these categories through configuration
 *   endpoints under
 *   `/communityPlatform/platformAdmin/communityRuleCategories`.
 * - When an admin attempts to update a category by a `communityRuleCategoryCode`
 *   that does not exist, the platform must not silently succeed or create a new
 *   category; it should instead behave as a not-found style error.
 *
 * Scenario steps:
 *
 * 1. Register a new platform administrator using POST /auth/platformAdmin/join.
 *    This also establishes an authenticated admin session on the shared
 *    connection, via the SDK storing the access token into
 *    `connection.headers.Authorization`.
 * 2. Optionally create a valid community rule category using POST
 *    /communityPlatform/platformAdmin/communityRuleCategories to confirm the
 *    service is operational and to provide a known-good code that we will
 *    **not** use for the failing update.
 * 3. Generate an obviously non-existent `communityRuleCategoryCode` that does not
 *    match the created category code.
 * 4. Call PUT
 *    /communityPlatform/platformAdmin/communityRuleCategories/{communityRuleCategoryCode}
 *    with this unknown code and a valid
 *    ICommunityPlatformCommunityRuleCategory.IUpdate payload.
 * 5. Use TestValidator.error to assert that the update operation throws an error,
 *    confirming that unknown business codes cannot be updated and do not result
 *    in a silent success.
 */
export async function test_api_community_rule_category_update_not_found_by_code(
  connection: api.IConnection,
) {
  // 1. Register a new platform administrator and establish an authenticated session.
  const joinBody = {
    username: RandomGenerator.alphaNumeric(12),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    displayName: RandomGenerator.name(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const admin: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: joinBody,
    });
  typia.assert(admin);

  // 2. Optionally create a valid community rule category as a sanity check.
  const createdCode = `behavior_${RandomGenerator.alphaNumeric(12)}`;

  const createBody = {
    code: createdCode,
    name: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.content({ paragraphs: 1 }),
    sort_order: typia.random<number & tags.Type<"int32">>(),
    is_active: true,
  } satisfies ICommunityPlatformCommunityRuleCategory.ICreate;

  const createdCategory: ICommunityPlatformCommunityRuleCategory =
    await api.functional.communityPlatform.platformAdmin.communityRuleCategories.create(
      connection,
      { body: createBody },
    );
  typia.assert(createdCategory);

  TestValidator.equals(
    "created category code should match request body",
    createdCategory.code,
    createdCode,
  );

  // 3. Prepare a clearly non-existent communityRuleCategoryCode for the update.
  const nonExistentCode = `nonexistent_${RandomGenerator.alphaNumeric(16)}`;

  // Guard against extremely unlikely collision with the created code.
  const updateCode =
    nonExistentCode === createdCode
      ? `nonexistent_${RandomGenerator.alphaNumeric(18)}`
      : nonExistentCode;

  TestValidator.notEquals(
    "non-existent update code must differ from created category code",
    updateCode,
    createdCode,
  );

  // 4. Build a syntactically valid update payload.
  const updateBody = {
    name: "Updated non-existing category",
    description: RandomGenerator.paragraph({ sentences: 5 }),
    is_active: false,
    sort_order: typia.random<number & tags.Type<"int32">>(),
  } satisfies ICommunityPlatformCommunityRuleCategory.IUpdate;

  // 5. Attempt the update and assert that it fails with an error.
  await TestValidator.error(
    "update with unknown category code must fail",
    async () => {
      await api.functional.communityPlatform.platformAdmin.communityRuleCategories.update(
        connection,
        {
          communityRuleCategoryCode: updateCode,
          body: updateBody,
        },
      );
    },
  );
}
