import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountStatus";
import type { ICommunityPlatformCommunityRuleCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityRuleCategory";
import type { ICommunityPlatformPlatformadmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPlatformadmin";

/**
 * Validate that duplicate community rule category codes are rejected for
 * platform admins.
 *
 * Business context:
 *
 * - Community rule categories live in
 *   `community_platform_community_rule_categories` with a globally unique
 *   `code`.
 * - Platform administrators manage this taxonomy via privileged endpoints under
 *   `/communityPlatform/platformAdmin/...`.
 * - Even a platformAdmin actor must not be able to introduce a second row with
 *   the same `code`.
 *
 * Test flow:
 *
 * 1. Register a platform admin using POST /auth/platformAdmin/join. This also
 *    issues JWTs and wires the Authorization header on the `connection`
 *    instance.
 * 2. With this authenticated connection, create an initial community rule category
 *    using POST /communityPlatform/platformAdmin/communityRuleCategories with a
 *    concrete `code`, `name`, `description`, `sort_order`, and `is_active`.
 * 3. Using the same admin session, attempt to create a second community rule
 *    category whose payload differs in human-facing fields (`name`,
 *    `description`, maybe `sort_order`/`is_active`) but reuses the exact same
 *    `code`.
 * 4. Assert that the duplicate creation attempt fails with a client-side error
 *    rather than returning a valid `ICommunityPlatformCommunityRuleCategory`
 *    record (i.e., uniqueness enforcement on `code` is active).
 *
 * Implementation notes:
 *
 * - Use only the provided SDK functions:
 *
 *   - Api.functional.auth.platformAdmin.join
 *   - Api.functional.communityPlatform.platformAdmin.communityRuleCategories.create
 * - Use valid, realistic data for `ICommunityPlatformPlatformadmin.IJoin` and
 *   `ICommunityPlatformCommunityRuleCategory.ICreate`.
 * - For the duplicate-category assertion, focus on the fact that an error is
 *   thrown, not on a specific HTTP status code or error payload structure
 *   (status-code checking is forbidden by the framework rules).
 * - Rely on TestValidator.error with an async closure for the second creation
 *   attempt.
 */
export async function test_api_community_rule_category_creation_duplicate_code_rejected(
  connection: api.IConnection,
) {
  // 1. Register a platform admin to obtain an authenticated connection
  const joinBody = {
    username: RandomGenerator.alphabets(12),
    email: `admin_${RandomGenerator.alphabets(8)}@example.com`,
    password: RandomGenerator.alphaNumeric(16),
    displayName: RandomGenerator.name(),
    ip: undefined,
    href: "https://admin.console.local/platform-admin/join",
    referrer: "https://admin.console.local/landing",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const admin: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: joinBody,
    });
  typia.assert(admin);

  // 2. Create an initial community rule category with a unique `code`
  const sharedCode = `rule_category_${RandomGenerator.alphaNumeric(8)}`;

  const firstCategoryBody = {
    code: sharedCode,
    name: "Content Guidelines",
    description: RandomGenerator.paragraph({
      sentences: 8,
      wordMin: 4,
      wordMax: 10,
    }),
    sort_order: 10,
    is_active: true,
  } satisfies ICommunityPlatformCommunityRuleCategory.ICreate;

  const firstCategory: ICommunityPlatformCommunityRuleCategory =
    await api.functional.communityPlatform.platformAdmin.communityRuleCategories.create(
      connection,
      {
        body: firstCategoryBody,
      },
    );
  typia.assert(firstCategory);

  TestValidator.equals(
    "first category uses the shared code",
    firstCategory.code,
    sharedCode,
  );

  // 3. Attempt to create a second category with the same `code` but different presentation fields
  const duplicateCategoryBody = {
    code: sharedCode, // <-- same code as firstCategory
    name: "Behavior Policy", // different name
    description: RandomGenerator.paragraph({
      sentences: 6,
      wordMin: 4,
      wordMax: 10,
    }),
    sort_order: 20, // different sort order
    is_active: true,
  } satisfies ICommunityPlatformCommunityRuleCategory.ICreate;

  // 4. Expect a business-logic error for the duplicate `code` creation attempt
  await TestValidator.error(
    "duplicate rule category code must be rejected",
    async () => {
      await api.functional.communityPlatform.platformAdmin.communityRuleCategories.create(
        connection,
        {
          body: duplicateCategoryBody,
        },
      );
    },
  );
}
