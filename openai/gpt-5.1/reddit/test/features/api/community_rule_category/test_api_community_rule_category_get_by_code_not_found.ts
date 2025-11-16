import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountStatus";
import type { ICommunityPlatformCommunityRuleCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityRuleCategory";
import type { ICommunityPlatformPlatformadmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPlatformadmin";

/**
 * Validate not-found behavior of community rule category lookup by code.
 *
 * This test verifies that GET
 * /communityPlatform/communityRuleCategories/{communityRuleCategoryCode}
 * returns a not-found HTTP error when the requested code does not exist, and
 * that this behavior is independent of both existing data and authentication
 * context.
 *
 * Test steps:
 *
 * 1. Join as a platform administrator using /auth/platformAdmin/join to obtain an
 *    authenticated connection with a valid Authorization header.
 * 2. Using the platformAdmin actor, create at least one valid community rule
 *    category via /communityPlatform/platformAdmin/communityRuleCategories with
 *    a random but well-formed code.
 * 3. Generate a clearly non-existent communityRuleCategoryCode string that is
 *    guaranteed to differ from the created category's code.
 * 4. Call GET
 *    /communityPlatform/communityRuleCategories/{communityRuleCategoryCode}
 *    with the non-existent code on the authenticated connection and assert that
 *    the call fails with an HTTP 404 not-found error using
 *    TestValidator.httpError.
 * 5. Create a shallow-cloned unauthenticated connection object whose headers field
 *    is an empty object, simulating a public client with no tokens.
 * 6. Call the same GET endpoint with the same non-existent code on the
 *    unauthenticated connection and assert that it also fails with HTTP 404,
 *    demonstrating that not-found behavior is independent of authentication.
 * 7. Optionally, call the GET endpoint with the valid created category code on the
 *    authenticated connection and assert a successful
 *    ICommunityPlatformCommunityRuleCategory response using typia.assert and a
 *    few simple field checks.
 */
export async function test_api_community_rule_category_get_by_code_not_found(
  connection: api.IConnection,
) {
  // 1. Join as platform administrator to obtain an authorized connection
  const joinBody = {
    username: RandomGenerator.alphabets(16),
    email: `${RandomGenerator.alphabets(8)}@example.com`,
    password: RandomGenerator.alphaNumeric(16),
    displayName: RandomGenerator.name(),
    href: "https://admin.example.com/register",
    referrer: "https://admin.example.com/landing",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const admin: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: joinBody,
    });
  typia.assert(admin);

  // 2. Create a valid community rule category as platformAdmin
  const categoryBody = {
    code: `behavior_${RandomGenerator.alphaNumeric(8)}`,
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.content({
      paragraphs: 1,
      sentenceMin: 5,
      sentenceMax: 10,
    }),
    sort_order: 1,
    is_active: true,
  } satisfies ICommunityPlatformCommunityRuleCategory.ICreate;

  const createdCategory: ICommunityPlatformCommunityRuleCategory =
    await api.functional.communityPlatform.platformAdmin.communityRuleCategories.create(
      connection,
      {
        body: categoryBody,
      },
    );
  typia.assert(createdCategory);

  TestValidator.equals(
    "created category code should match requested code",
    createdCategory.code,
    categoryBody.code,
  );

  // 3. Generate a clearly non-existent code
  const nonExistentCode = `nonexistent_${createdCategory.code}_${RandomGenerator.alphaNumeric(6)}`;

  TestValidator.notEquals(
    "non-existent code must differ from created category code",
    nonExistentCode,
    createdCategory.code,
  );

  // 4. Call GET with non-existent code on authenticated connection, expect 404
  await TestValidator.httpError(
    "authenticated GET by non-existent community rule category code must return 404",
    404,
    async () => {
      await api.functional.communityPlatform.communityRuleCategories.at(
        connection,
        {
          communityRuleCategoryCode: nonExistentCode,
        },
      );
    },
  );

  // 5. Create an unauthenticated connection by shallow-cloning with empty headers
  const unauthConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  // 6. Call GET with non-existent code on unauthenticated connection, expect 404
  await TestValidator.httpError(
    "unauthenticated GET by non-existent community rule category code must return 404",
    404,
    async () => {
      await api.functional.communityPlatform.communityRuleCategories.at(
        unauthConnection,
        {
          communityRuleCategoryCode: nonExistentCode,
        },
      );
    },
  );

  // 7. Optional sanity: GET with existing code on authenticated connection succeeds
  const fetchedCategory: ICommunityPlatformCommunityRuleCategory =
    await api.functional.communityPlatform.communityRuleCategories.at(
      connection,
      {
        communityRuleCategoryCode: createdCategory.code,
      },
    );
  typia.assert(fetchedCategory);

  TestValidator.equals(
    "fetched category id should match created category id",
    fetchedCategory.id,
    createdCategory.id,
  );
}
