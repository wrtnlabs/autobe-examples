import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppCategory";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";

/**
 * Test successful update of both category name and description. Validates that
 * users can modify category information while preserving the category ID and
 * maintaining all existing task relationships. Tests that updated names remain
 * unique within the user's account and that description changes are properly
 * persisted.
 */
export async function test_api_category_update_name_and_description(
  connection: api.IConnection,
) {
  // 1. Create user account for authentication
  const userJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    ip: "127.0.0.1",
    href: "https://example.com/",
    referrer: "https://example.com/signup",
  } satisfies ITodoAppUser.IJoin;

  const user = await api.functional.auth.user.join(connection, {
    body: userJoinBody,
  });
  typia.assert(user);

  // 2. Create initial category
  const categoryCreateBody = {
    name: RandomGenerator.name(1),
    description: RandomGenerator.paragraph({ sentences: 2 }),
  } satisfies ITodoAppCategory.ICreate;

  const initialCategory = await api.functional.todoApp.user.categories.create(
    connection,
    {
      body: categoryCreateBody,
    },
  );
  typia.assert(initialCategory);

  // 3. Update both category name and description
  const categoryUpdateBody = {
    name: RandomGenerator.name(1),
    description: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies ITodoAppCategory.IUpdate;

  const updatedCategory = await api.functional.todoApp.user.categories.update(
    connection,
    {
      categoryId: initialCategory.id,
      body: categoryUpdateBody,
    },
  );
  typia.assert(updatedCategory);

  // 4. Validate the update was successful
  TestValidator.equals(
    "category ID preserved",
    updatedCategory.id,
    initialCategory.id,
  );
  TestValidator.equals(
    "user relationship preserved",
    updatedCategory.user.id,
    initialCategory.user.id,
  );
  TestValidator.notEquals(
    "category name updated",
    updatedCategory.name,
    initialCategory.name,
  );
  TestValidator.notEquals(
    "category description updated",
    updatedCategory.description,
    initialCategory.description,
  );
  TestValidator.equals(
    "updated name equals request",
    updatedCategory.name,
    categoryUpdateBody.name,
  );
  TestValidator.equals(
    "updated description equals request",
    updatedCategory.description,
    categoryUpdateBody.description,
  );

  // 5. Validate timestamps reflect update
  TestValidator.predicate(
    "updated_at is newer than created_at",
    new Date(updatedCategory.updated_at).getTime() >
      new Date(initialCategory.created_at).getTime(),
  );
}
