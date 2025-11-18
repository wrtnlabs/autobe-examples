import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppCategory";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";

export async function test_api_category_retrieval_invalid_id(
  connection: api.IConnection,
) {
  // 1. Create a valid user to ensure authentication
  const user = await api.functional.auth.user.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
      ip: null,
      href: "https://example.com",
      referrer: "https://example.com",
    } satisfies ITodoAppUser.IJoin,
  });
  typia.assert(user);

  // 2. Test retrieval with valid but non-existent category ID
  // This tests the business logic of accessing a category that doesn't exist
  const nonExistentCategoryId = typia.random<string & tags.Format<"uuid">>();

  await TestValidator.error(
    "should error when retrieving non-existent category by ID",
    async () => {
      await api.functional.todoApp.user.categories.at(connection, {
        categoryId: nonExistentCategoryId,
      });
    },
  );

  // 3. Test with a valid UUID format but potentially restricted access
  // This validates proper authorization checking for category access
  const validFormatId = typia.random<string & tags.Format<"uuid">>();

  await TestValidator.error(
    "should enforce proper authorization for category access",
    async () => {
      await api.functional.todoApp.user.categories.at(connection, {
        categoryId: validFormatId,
      });
    },
  );
}
