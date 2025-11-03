import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityBbsCommunityCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsCommunityCategory";
import type { ICommunityBbsSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsSystemAdmin";

export async function test_api_category_update_by_system_admin(
  connection: api.IConnection,
) {
  // Create a unique admin account and obtain authorization
  const adminEmail = `system-admin-${Date.now()}@example.test`;
  const adminPassword = "Passw0rd!1"; // satisfies password policy (min8, uppercase, lowercase, digit)

  const adminAuthorized: ICommunityBbsSystemAdmin.IAuthorized =
    await api.functional.auth.systemAdmin.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        display_name: RandomGenerator.name(),
      } satisfies ICommunityBbsSystemAdmin.ICreate,
    });
  typia.assert(adminAuthorized);

  // Prepare unique category code and create the category as system admin
  const categoryCode = `test-category-${Date.now()}`;
  const createBody = {
    code: categoryCode,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.content({ paragraphs: 1 }),
    display_order: 1,
  } satisfies ICommunityBbsCommunityCategory.ICreate;

  const created: ICommunityBbsCommunityCategory =
    await api.functional.communityBbs.systemAdmin.categories.create(
      connection,
      {
        body: createBody,
      },
    );
  typia.assert(created);

  // Prepare update payload: change title, description, and display_order
  const updatedTitle = `${created.title} - updated`;
  const updatedDescription = RandomGenerator.content({ paragraphs: 1 });
  const updatedDisplayOrder = (created.display_order ?? 0) + 5;

  const updated: ICommunityBbsCommunityCategory =
    await api.functional.communityBbs.systemAdmin.categories.update(
      connection,
      {
        categoryCode: created.code,
        body: {
          title: updatedTitle,
          description: updatedDescription,
          display_order: updatedDisplayOrder,
        } satisfies ICommunityBbsCommunityCategory.IUpdate,
      },
    );
  typia.assert(updated);

  // Assertions
  TestValidator.equals("category code unchanged", updated.code, created.code);
  TestValidator.equals("title updated", updated.title, updatedTitle);
  TestValidator.equals(
    "description updated",
    updated.description,
    updatedDescription,
  );
  TestValidator.equals(
    "display_order updated",
    updated.display_order,
    updatedDisplayOrder,
  );

  // updated_at should be more recent than created_at
  TestValidator.predicate(
    "updated_at newer than created_at",
    Date.parse(updated.updated_at) > Date.parse(created.created_at),
  );

  // Auditability: when available the created.created_by should match the admin actor
  if (created.created_by !== null && created.created_by !== undefined) {
    TestValidator.equals(
      "created_by matches admin",
      created.created_by.id,
      adminAuthorized.admin.id,
    );
  }
}
