import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconPoliticalForumAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumAdministrator";
import type { IEconPoliticalForumCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumCategory";
import type { IEconPoliticalForumRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumRegisteredUser";

export async function test_api_category_soft_delete_by_administrator(
  connection: api.IConnection,
) {
  // 1) Administrator registration (new admin context for the test)
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "StrongP@ssw0rd!"; // >=10 chars as required by DTO

  const admin = await api.functional.auth.administrator.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      username: RandomGenerator.name(1),
      display_name: RandomGenerator.name(2),
    } satisfies IEconPoliticalForumAdministrator.IJoin,
  });
  typia.assert(admin);

  // Optional: ensure authorization token and user summary are present
  TestValidator.predicate(
    "admin authorization token present",
    admin.token !== null &&
      admin.token !== undefined &&
      typeof admin.token.access === "string",
  );

  // 2) Create a category using administrator privileges
  const categoryName = RandomGenerator.paragraph({
    sentences: 3,
    wordMin: 3,
    wordMax: 8,
  });
  const categorySlug = RandomGenerator.alphaNumeric(8).toLowerCase();

  const createBody = {
    code: null,
    name: categoryName,
    slug: categorySlug,
    description: null,
    is_moderated: false,
    requires_verification: false,
    order: 1,
  } satisfies IEconPoliticalForumCategory.ICreate;

  const category: IEconPoliticalForumCategory =
    await api.functional.econPoliticalForum.administrator.categories.create(
      connection,
      {
        body: createBody,
      },
    );
  typia.assert(category);

  // Validate initial state: deleted_at must be null/undefined for freshly created category
  TestValidator.predicate(
    "category.deleted_at is null or undefined before deletion",
    category.deleted_at === null || category.deleted_at === undefined,
  );

  // 3) Soft-delete the created category
  await api.functional.econPoliticalForum.administrator.categories.erase(
    connection,
    {
      categoryId: category.id,
    },
  );

  // 4) Attempting to delete again should produce a business error (409 Conflict per API docs)
  await TestValidator.error(
    "deleting already deleted category should fail",
    async () => {
      await api.functional.econPoliticalForum.administrator.categories.erase(
        connection,
        {
          categoryId: category.id,
        },
      );
    },
  );

  // Note: Audit log verification and public GET for deleted category are not
  // possible here because the SDK does not expose read endpoints for categories
  // or audit logs in the provided materials. Those checks should be covered by
  // separate integration tests or by expanding the SDK with read endpoints.
}
