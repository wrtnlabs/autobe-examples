import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconPoliticalForumAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumAdministrator";
import type { IEconPoliticalForumCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumCategory";
import type { IEconPoliticalForumRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumRegisteredUser";

export async function test_api_category_get_public_and_admin_deleted_view(
  connection: api.IConnection,
) {
  /**
   * Purpose: Validate public and admin retrieval behavior for a category,
   * including soft-delete visibility rules.
   *
   * Steps:
   *
   * 1. Register an administrator (auth.administrator.join)
   * 2. Create a category as admin (administrator.categories.create)
   * 3. Retrieve the category as public (no auth) and validate fields
   * 4. Soft-delete the category as admin (administrator.categories.erase)
   * 5. Ensure public retrieval fails for deleted category
   * 6. Ensure admin retrieval succeeds and contains deleted_at
   */

  // 1) Administrator registration
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminJoinBody = {
    email: adminEmail,
    password: "strong-password-123", // satisfies MinLength<10>
    username: RandomGenerator.name(1),
    display_name: RandomGenerator.name(2),
  } satisfies IEconPoliticalForumAdministrator.IJoin;

  const adminAuth: IEconPoliticalForumAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuth);

  // After join, SDK sets connection.headers.Authorization to admin token
  // Prepare category creation body
  const createCategoryBody = {
    name: "Detail Category",
    slug: "detail-category",
    description: "Category for detailed view tests",
    is_moderated: true,
    requires_verification: true,
    order: 5,
  } satisfies IEconPoliticalForumCategory.ICreate;

  // 2) Create a category as admin
  const category: IEconPoliticalForumCategory =
    await api.functional.econPoliticalForum.administrator.categories.create(
      connection,
      {
        body: createCategoryBody,
      },
    );
  typia.assert(category);

  // 3) Public retrieval of active category (unauthenticated)
  const unauthConn: api.IConnection = { ...connection, headers: {} };

  const publicView: IEconPoliticalForumCategory =
    await api.functional.econPoliticalForum.categories.at(unauthConn, {
      categoryId: category.id,
    });
  typia.assert(publicView);

  TestValidator.equals(
    "public category id matches created category",
    publicView.id,
    category.id,
  );
  TestValidator.equals(
    "public category name matches",
    publicView.name,
    createCategoryBody.name,
  );
  TestValidator.equals(
    "public category slug matches",
    publicView.slug,
    createCategoryBody.slug,
  );
  TestValidator.equals(
    "public category is_moderated matches",
    publicView.is_moderated,
    createCategoryBody.is_moderated,
  );
  TestValidator.equals(
    "public category requires_verification matches",
    publicView.requires_verification,
    createCategoryBody.requires_verification,
  );

  // public view should not expose a deleted_at for an active category
  TestValidator.predicate(
    "public deleted_at is null or undefined for active category",
    publicView.deleted_at === null || publicView.deleted_at === undefined,
  );

  // 4) Soft-delete the category (admin)
  await api.functional.econPoliticalForum.administrator.categories.erase(
    connection,
    {
      categoryId: category.id,
    },
  );

  // 5) Public retrieval after deletion -- should throw (treat as not found)
  await TestValidator.error(
    "public GET for deleted category should fail",
    async () => {
      await api.functional.econPoliticalForum.categories.at(unauthConn, {
        categoryId: category.id,
      });
    },
  );

  // 6) Admin retrieval of deleted category should succeed and include deleted_at
  const adminView: IEconPoliticalForumCategory =
    await api.functional.econPoliticalForum.categories.at(connection, {
      categoryId: category.id,
    });
  typia.assert(adminView);

  TestValidator.equals("admin category id matches", adminView.id, category.id);
  TestValidator.predicate(
    "admin view contains deleted_at",
    adminView.deleted_at !== null && adminView.deleted_at !== undefined,
  );

  TestValidator.predicate(
    "admin view contains updated_at",
    adminView.updated_at !== null && adminView.updated_at !== undefined,
  );

  // Teardown note: rely on test harness DB reset or admin tooling to remove created data
}
