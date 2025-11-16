import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountStatus";
import type { ICommunityPlatformContentPolicyCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformContentPolicyCategory";
import type { ICommunityPlatformPlatformadmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPlatformadmin";

export async function test_api_content_policy_category_get_by_code_success(
  connection: api.IConnection,
) {
  // 1. Register a platform admin via POST /auth/platformAdmin/join
  const joinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    displayName: RandomGenerator.name(),
    href: "https://admin.console.local/join",
    referrer: "https://admin.console.local/landing",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const admin: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: joinBody,
    });
  typia.assert(admin);

  // 2. As this admin, create a new content policy category with deterministic code
  const categoryCode = "self_harm";
  const createBody = {
    code: categoryCode,
    name: "Self-harm and Suicide",
    description:
      "Content promoting, glorifying, or instructing self-harm or suicide, including encouragement or detailed methods.",
    isActive: true,
    isDefault: true,
  } satisfies ICommunityPlatformContentPolicyCategory.ICreate;

  const createdCategory: ICommunityPlatformContentPolicyCategory =
    await api.functional.communityPlatform.platformAdmin.contentPolicyCategories.create(
      connection,
      {
        body: createBody,
      },
    );
  typia.assert(createdCategory);

  // Business-level validations on the created entity
  TestValidator.equals(
    "created category code must match input code",
    createdCategory.code,
    categoryCode,
  );
  TestValidator.equals(
    "created category name must match input name",
    createdCategory.name,
    createBody.name,
  );
  TestValidator.equals(
    "created category description must match input description",
    createdCategory.description,
    createBody.description,
  );
  TestValidator.equals(
    "created category isActive must match input isActive",
    createdCategory.isActive,
    createBody.isActive,
  );
  TestValidator.equals(
    "created category isDefault must match input isDefault",
    createdCategory.isDefault,
    createBody.isDefault,
  );

  // 3. Call GET /communityPlatform/contentPolicyCategories/{contentPolicyCategoryCode}
  const fetchedCategory: ICommunityPlatformContentPolicyCategory =
    await api.functional.communityPlatform.contentPolicyCategories.at(
      connection,
      {
        contentPolicyCategoryCode: categoryCode,
      },
    );
  typia.assert(fetchedCategory);

  // 4. Validate that the fetched category matches the created one on business fields
  TestValidator.equals(
    "fetched category code must equal created category code",
    fetchedCategory.code,
    createdCategory.code,
  );
  TestValidator.equals(
    "fetched category name must equal created category name",
    fetchedCategory.name,
    createdCategory.name,
  );
  TestValidator.equals(
    "fetched category description must equal created category description",
    fetchedCategory.description,
    createdCategory.description,
  );
  TestValidator.equals(
    "fetched category isActive must equal created category isActive",
    fetchedCategory.isActive,
    createdCategory.isActive,
  );
  TestValidator.equals(
    "fetched category isDefault must equal created category isDefault",
    fetchedCategory.isDefault,
    createdCategory.isDefault,
  );

  // Soft-delete semantics: non-deleted category should have deletedAt === null or undefined
  TestValidator.predicate(
    "created category deletedAt should be null or undefined for non-deleted category",
    createdCategory.deletedAt === null ||
      createdCategory.deletedAt === undefined,
  );
  TestValidator.predicate(
    "fetched category deletedAt should be null or undefined for non-deleted category",
    fetchedCategory.deletedAt === null ||
      fetchedCategory.deletedAt === undefined,
  );
}
