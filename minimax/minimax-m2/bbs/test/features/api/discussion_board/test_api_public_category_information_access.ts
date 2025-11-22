import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconPoliticalDiscussionCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalDiscussionCategory";
import type { IEconPoliticalDiscussionSystemAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalDiscussionSystemAdministrator";
import type { IEconPoliticalDiscussionUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalDiscussionUser";

export async function test_api_public_category_information_access(
  connection: api.IConnection,
) {
  // Step 1: Create administrative context to establish test category for public retrieval testing
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const admin: IEconPoliticalDiscussionSystemAdministrator.IAuthorized =
    await api.functional.auth.systemAdministrator.join.create(connection, {
      body: {
        display_name: RandomGenerator.name(),
        email: adminEmail,
        status: "active",
      } satisfies IEconPoliticalDiscussionUser.ICreate,
    });
  typia.assert(admin);

  // Step 2: Generate category data for public information access validation
  const categoryData = {
    name: "Economic Policy",
    description:
      "Discussions about government economic policies, fiscal measures, and economic regulations that affect markets and public welfare",
    display_order: typia.random<
      number & tags.Type<"uint32"> & tags.Minimum<0> & tags.Maximum<1000>
    >(),
    is_active: true,
  } satisfies IEconPoliticalDiscussionCategory.ICreate;

  const createdCategory: IEconPoliticalDiscussionCategory =
    await api.functional.econPoliticalDiscussion.systemAdministrator.categories.create(
      connection,
      {
        body: categoryData,
      },
    );
  typia.assert(createdCategory);

  // Step 3: Test public access to category information without authentication
  // Switch to unauthenticated connection to test public access
  const publicConnection: api.IConnection = { ...connection, headers: {} };

  const retrievedCategory: IEconPoliticalDiscussionCategory =
    await api.functional.econPoliticalDiscussion.categories.at(
      publicConnection,
      {
        categoryId: createdCategory.id,
      },
    );
  typia.assert(retrievedCategory);

  // Step 4: Validate that category information is accessible to all users
  // Verify the retrieved category matches the created category
  TestValidator.equals(
    "category ID matches",
    retrievedCategory.id,
    createdCategory.id,
  );
  TestValidator.equals(
    "category name matches",
    retrievedCategory.name,
    createdCategory.name,
  );
  TestValidator.equals(
    "category description matches",
    retrievedCategory.description,
    createdCategory.description,
  );
  TestValidator.equals(
    "display order matches",
    retrievedCategory.display_order,
    createdCategory.display_order,
  );
  TestValidator.equals(
    "category status matches",
    retrievedCategory.status,
    createdCategory.status,
  );

  // Step 5: Verify temporal data is properly exposed in public access
  TestValidator.predicate(
    "created_at timestamp is present",
    retrievedCategory.created_at !== null &&
      retrievedCategory.created_at !== undefined,
  );
  TestValidator.predicate(
    "updated_at timestamp is present",
    retrievedCategory.updated_at !== null &&
      retrievedCategory.updated_at !== undefined,
  );
  TestValidator.predicate(
    "deleted_at is null for active category",
    retrievedCategory.deleted_at === null ||
      retrievedCategory.deleted_at === undefined,
  );

  // Step 6: Validate business logic - public access should work without authentication
  TestValidator.equals(
    "public access successful",
    retrievedCategory.id,
    createdCategory.id,
  );
  TestValidator.predicate(
    "category data completeness",
    retrievedCategory.name.length > 0 &&
      retrievedCategory.description.length > 0,
  );
}
