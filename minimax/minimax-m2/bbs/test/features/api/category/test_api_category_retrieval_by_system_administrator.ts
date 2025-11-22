import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconPoliticalDiscussionCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalDiscussionCategory";
import type { IEconPoliticalDiscussionSystemAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalDiscussionSystemAdministrator";
import type { IEconPoliticalDiscussionUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalDiscussionUser";

/**
 * Validate complete category retrieval workflow after administrator creation.
 *
 * This scenario tests the end-to-end process of category management from
 * creation to retrieval, ensuring that categories can be successfully located
 * and their complete information returned including metadata, descriptions,
 * creation timestamps, and article count statistics.
 *
 * The test follows this workflow:
 *
 * 1. Create a system administrator account to establish authentication context
 * 2. Create a test category through the administrative interface
 * 3. Retrieve the specific category by its unique identifier
 * 4. Validate that all category information is correctly returned
 */
export async function test_api_category_retrieval_by_system_administrator(
  connection: api.IConnection,
) {
  // Step 1: Create system administrator account for authentication
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin: IEconPoliticalDiscussionSystemAdministrator.IAuthorized =
    await api.functional.auth.systemAdministrator.join.create(connection, {
      body: {
        display_name: "System Administrator",
        email: adminEmail,
        status: "active",
      } satisfies IEconPoliticalDiscussionUser.ICreate,
    });
  typia.assert(admin);
  TestValidator.equals(
    "admin account created successfully",
    admin.email,
    adminEmail,
  );

  // Step 2: Create a test category using administrator privileges
  const categoryData = {
    name: "Market Analysis",
    description:
      "Discussion and analysis of financial markets, trading strategies, economic indicators, and market trends affecting economic and political discourse.",
    display_order: 1,
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

  // Validate category creation data matches input
  TestValidator.equals(
    "category name matches input",
    createdCategory.name,
    categoryData.name,
  );
  TestValidator.equals(
    "category description matches input",
    createdCategory.description,
    categoryData.description,
  );
  TestValidator.equals(
    "display order matches input",
    createdCategory.display_order,
    categoryData.display_order,
  );
  TestValidator.equals(
    "category status is active",
    createdCategory.status,
    "active",
  );

  // Step 3: Retrieve the created category by its unique identifier
  const retrievedCategory: IEconPoliticalDiscussionCategory =
    await api.functional.econPoliticalDiscussion.categories.at(connection, {
      categoryId: createdCategory.id,
    });
  typia.assert(retrievedCategory);

  // Step 4: Validate complete category information retrieval
  TestValidator.equals(
    "retrieved category ID matches created",
    retrievedCategory.id,
    createdCategory.id,
  );
  TestValidator.equals(
    "retrieved category name matches",
    retrievedCategory.name,
    createdCategory.name,
  );
  TestValidator.equals(
    "retrieved category description matches",
    retrievedCategory.description,
    createdCategory.description,
  );
  TestValidator.equals(
    "retrieved display order matches",
    retrievedCategory.display_order,
    createdCategory.display_order,
  );
  TestValidator.equals(
    "retrieved status matches",
    retrievedCategory.status,
    createdCategory.status,
  );
  TestValidator.equals(
    "created timestamps are present",
    retrievedCategory.created_at,
    createdCategory.created_at,
  );
  TestValidator.equals(
    "updated timestamps are present",
    retrievedCategory.updated_at,
    createdCategory.updated_at,
  );

  // Validate that retrieved data is complete and consistent
  TestValidator.notEquals(
    "category has valid UUID",
    retrievedCategory.id,
    null,
  );
  TestValidator.predicate(
    "category name is non-empty string",
    typeof retrievedCategory.name === "string" &&
      retrievedCategory.name.length > 0,
  );
  TestValidator.predicate(
    "category description is non-empty string",
    typeof retrievedCategory.description === "string" &&
      retrievedCategory.description.length > 0,
  );
}
