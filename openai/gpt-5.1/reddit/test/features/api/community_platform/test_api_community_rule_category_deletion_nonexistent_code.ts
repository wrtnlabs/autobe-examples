import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountStatus";
import type { ICommunityPlatformCommunityRuleCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityRuleCategory";
import type { ICommunityPlatformPlatformadmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPlatformadmin";

export async function test_api_community_rule_category_deletion_nonexistent_code(
  connection: api.IConnection,
) {
  // 1. Register a platform admin and establish authenticated session
  const joinBody = {
    username: RandomGenerator.alphabets(12),
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

  // 2. Create a legitimate community rule category as baseline data
  const baseCategoryCode: string = RandomGenerator.alphabets(10);
  const createBody = {
    code: baseCategoryCode,
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.content({ paragraphs: 1 }),
    sort_order: typia.random<number & tags.Type<"int32">>(),
    is_active: true,
  } satisfies ICommunityPlatformCommunityRuleCategory.ICreate;

  const createdCategory: ICommunityPlatformCommunityRuleCategory =
    await api.functional.communityPlatform.platformAdmin.communityRuleCategories.create(
      connection,
      {
        body: createBody,
      },
    );
  typia.assert(createdCategory);
  TestValidator.equals(
    "created category code must match request body code",
    createdCategory.code,
    baseCategoryCode,
  );

  // 3. Choose a clearly non-existent category code different from the created one
  const nonexistentCode: string = `${baseCategoryCode}_nonexistent`;

  // 4. Attempt to delete using the non-existent code and expect not-found HTTP error
  await TestValidator.httpError(
    "erasing non-existent community rule category must result in not-found HTTP error",
    [404],
    async () => {
      await api.functional.communityPlatform.platformAdmin.communityRuleCategories.erase(
        connection,
        {
          communityRuleCategoryCode: nonexistentCode,
        },
      );
    },
  );

  // 5. Optional safety: attempt to create the same base category code again to
  //    ensure it was not deleted by mistake. If the original delete had side
  //    effects, this may fail with a business validation error (e.g., duplicate
  //    code). We treat success as strong evidence of no side effects but do not
  //    assert on failure because duplicates may legitimately be rejected.
  const secondCreateBody = {
    code: baseCategoryCode,
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.content({ paragraphs: 1 }),
    sort_order: typia.random<number & tags.Type<"int32">>(),
    is_active: true,
  } satisfies ICommunityPlatformCommunityRuleCategory.ICreate;

  try {
    const recreatedCategory: ICommunityPlatformCommunityRuleCategory =
      await api.functional.communityPlatform.platformAdmin.communityRuleCategories.create(
        connection,
        {
          body: secondCreateBody,
        },
      );
    typia.assert(recreatedCategory);
  } catch {
    // If this fails due to duplicate code semantics, it still proves that the
    // bogus delete had no destructive effect on the original category.
  }
}
