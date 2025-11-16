import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountStatus";
import type { ICommunityPlatformCommunityRuleCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityRuleCategory";
import type { ICommunityPlatformPlatformadmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPlatformadmin";

/**
 * Validate lifecycle: create an active community rule category, inactivate it,
 * then delete it.
 *
 * Business goals:
 *
 * - Ensure a platform admin can create a new community rule category as active.
 * - Ensure the same admin can later inactivate the category via the update
 *   endpoint by flipping `is_active` to false.
 * - Ensure the inactive category can then be deleted via the erase endpoint.
 * - Ensure repeated deletion with the same code fails, indirectly proving that
 *   the category is no longer deletable/available.
 *
 * High level flow:
 *
 * 1. Register a platform admin via POST /auth/platformAdmin/join.
 *
 *    - Use a realistic, random ICommunityPlatformPlatformadmin.IJoin payload.
 *    - Confirm the response is a valid ICommunityPlatformPlatformadmin.IAuthorized
 *         and that Authorization is now wired into the connection by the SDK.
 * 2. Create a community rule category via POST
 *    /communityPlatform/platformAdmin/communityRuleCategories.
 *
 *    - Build an ICommunityPlatformCommunityRuleCategory.ICreate payload with:
 *
 *         - Code: random alphanumeric identifier suitable as a stable business key.
 *         - Name: short, human-readable label.
 *         - Description: multi-sentence text from RandomGenerator.content.
 *         - Sort_order: reasonable small int32 value.
 *         - Is_active: true.
 *    - Assert the returned ICommunityPlatformCommunityRuleCategory:
 *
 *         - Matches input fields (code, name, description, sort_order, is_active).
 *         - Has deleted_at === null or undefined, since it is freshly created.
 * 3. Inactivate the category via PUT
 *    /communityPlatform/platformAdmin/communityRuleCategories/{communityRuleCategoryCode}.
 *
 *    - Use communityRuleCategoryCode = created.code.
 *    - Request body: ICommunityPlatformCommunityRuleCategory.IUpdate with is_active:
 *         false, possibly also tweaking name/description/sort_order to ensure
 *         updates are applied correctly.
 *    - Assert response:
 *
 *         - Code remains unchanged.
 *         - Is_active is false.
 *         - Updated fields reflect the request body.
 * 4. Delete the now-inactive category via DELETE
 *    /communityPlatform/platformAdmin/communityRuleCategories/{communityRuleCategoryCode}.
 *
 *    - Call erase once with the same code and expect no error.
 * 5. Attempt to delete again with the same code and validate an error using
 *    TestValidator.error, as indirect evidence that the category is no longer
 *    present or deletable.
 */
export async function test_api_community_rule_category_deletion_after_inactivation(
  connection: api.IConnection,
) {
  // 1. Register a platform admin (join) and validate authorized response
  const joinBody = {
    username: RandomGenerator.alphabets(12),
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

  TestValidator.predicate(
    "platform admin id should be a non-empty uuid string",
    typeof admin.id === "string" && admin.id.length > 0,
  );
  TestValidator.predicate(
    "platform admin username should match join request",
    admin.username === joinBody.username,
  );
  TestValidator.predicate(
    "platform admin email should match join request",
    admin.email === joinBody.email,
  );

  // 2. Create an active community rule category
  const categoryCode: string = RandomGenerator.alphaNumeric(12);
  const createBody = {
    code: categoryCode,
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.content({
      paragraphs: 2,
      sentenceMin: 3,
      sentenceMax: 6,
    }),
    sort_order: typia.random<number & tags.Type<"int32">>(),
    is_active: true,
  } satisfies ICommunityPlatformCommunityRuleCategory.ICreate;

  const created: ICommunityPlatformCommunityRuleCategory =
    await api.functional.communityPlatform.platformAdmin.communityRuleCategories.create(
      connection,
      { body: createBody },
    );
  typia.assert(created);

  TestValidator.equals(
    "created category code should match request",
    created.code,
    createBody.code,
  );
  TestValidator.equals(
    "created category name should match request",
    created.name,
    createBody.name,
  );
  TestValidator.equals(
    "created category description should match request",
    created.description,
    createBody.description,
  );
  TestValidator.equals(
    "created category sort_order should match request",
    created.sort_order,
    createBody.sort_order,
  );
  TestValidator.equals(
    "created category is_active should be true",
    created.is_active,
    true,
  );
  TestValidator.predicate(
    "created category deleted_at should be null or undefined",
    created.deleted_at === null || created.deleted_at === undefined,
  );

  // 3. Inactivate the category via update (set is_active to false)
  const updateBody = {
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.content({
      paragraphs: 1,
      sentenceMin: 3,
      sentenceMax: 5,
    }),
    is_active: false,
    sort_order: createBody.sort_order,
  } satisfies ICommunityPlatformCommunityRuleCategory.IUpdate;

  const updated: ICommunityPlatformCommunityRuleCategory =
    await api.functional.communityPlatform.platformAdmin.communityRuleCategories.update(
      connection,
      {
        communityRuleCategoryCode: created.code,
        body: updateBody,
      },
    );
  typia.assert(updated);

  TestValidator.equals(
    "updated category code should remain unchanged",
    updated.code,
    created.code,
  );
  TestValidator.equals(
    "updated category is_active should be false",
    updated.is_active,
    false,
  );
  TestValidator.equals(
    "updated category name should match update payload",
    updated.name,
    updateBody.name,
  );
  TestValidator.equals(
    "updated category description should match update payload",
    updated.description,
    updateBody.description,
  );
  TestValidator.equals(
    "updated category sort_order should match update payload",
    updated.sort_order,
    updateBody.sort_order,
  );

  // 4. Delete the now-inactive category
  await api.functional.communityPlatform.platformAdmin.communityRuleCategories.erase(
    connection,
    {
      communityRuleCategoryCode: created.code,
    },
  );

  // 5. Attempt to delete again, expecting an error as indirect deletion proof
  await TestValidator.error(
    "second delete on same code should fail",
    async () => {
      await api.functional.communityPlatform.platformAdmin.communityRuleCategories.erase(
        connection,
        {
          communityRuleCategoryCode: created.code,
        },
      );
    },
  );
}
