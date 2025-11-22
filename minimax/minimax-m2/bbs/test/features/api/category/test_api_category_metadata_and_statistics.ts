import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconPoliticalDiscussionCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalDiscussionCategory";
import type { IEconPoliticalDiscussionSystemAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalDiscussionSystemAdministrator";
import type { IEconPoliticalDiscussionUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalDiscussionUser";

export async function test_api_category_metadata_and_statistics(
  connection: api.IConnection,
) {
  // Step 1: Create system administrator account for authentication
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin: IEconPoliticalDiscussionSystemAdministrator.IAuthorized =
    await api.functional.auth.systemAdministrator.join.create(connection, {
      body: {
        display_name: RandomGenerator.name(),
        email: adminEmail,
        status: "active",
      } satisfies IEconPoliticalDiscussionUser.ICreate,
    });
  typia.assert(admin);

  // Step 2: Create category with complete metadata
  const categoryData = {
    name: "Economic Policy Discussion",
    description:
      "A comprehensive forum for discussing economic policies, regulations, and their impact on markets and society. This category covers topics ranging from fiscal policy to monetary systems, trade agreements, and regulatory frameworks.",
    display_order: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<0> & tags.Maximum<100>
    >(),
    is_active: true,
  } satisfies IEconPoliticalDiscussionCategory.ICreate;

  const createdCategory: IEconPoliticalDiscussionCategory =
    await api.functional.econPoliticalDiscussion.systemAdministrator.categories.create(
      connection,
      { body: categoryData },
    );
  typia.assert(createdCategory);

  // Step 3: Retrieve the category and validate complete metadata
  const retrievedCategory: IEconPoliticalDiscussionCategory =
    await api.functional.econPoliticalDiscussion.categories.at(connection, {
      categoryId: createdCategory.id,
    });
  typia.assert(retrievedCategory);

  // Step 4: Comprehensive metadata validation
  TestValidator.equals(
    "category ID matches",
    createdCategory.id,
    retrievedCategory.id,
  );
  TestValidator.equals(
    "category name matches",
    createdCategory.name,
    retrievedCategory.name,
  );
  TestValidator.equals(
    "category description matches",
    createdCategory.description,
    retrievedCategory.description,
  );
  TestValidator.equals(
    "display order matches",
    createdCategory.display_order,
    retrievedCategory.display_order,
  );
  TestValidator.equals(
    "status matches",
    createdCategory.status,
    retrievedCategory.status,
  );
  TestValidator.equals(
    "created timestamp present",
    retrievedCategory.created_at,
    createdCategory.created_at,
  );
  TestValidator.equals(
    "updated timestamp present",
    retrievedCategory.updated_at,
    createdCategory.updated_at,
  );
  TestValidator.equals(
    "deleted timestamp is null",
    retrievedCategory.deleted_at,
    null,
  );

  // Step 5: Validate metadata structure and types
  TestValidator.predicate(
    "ID is valid UUID format",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      retrievedCategory.id,
    ),
  );
  TestValidator.predicate(
    "created_at is valid date-time format",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z$/.test(
      retrievedCategory.created_at,
    ),
  );
  TestValidator.predicate(
    "updated_at is valid date-time format",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z$/.test(
      retrievedCategory.updated_at,
    ),
  );
  TestValidator.predicate(
    "display_order is non-negative integer",
    retrievedCategory.display_order >= 0 &&
      Number.isInteger(retrievedCategory.display_order),
  );

  // Step 6: Validate business logic constraints
  TestValidator.equals(
    "category is active",
    retrievedCategory.status,
    "active",
  );
  TestValidator.predicate(
    "description is comprehensive",
    retrievedCategory.description.length > 50,
  );
  TestValidator.predicate(
    "display order is within reasonable range",
    retrievedCategory.display_order <= 100,
  );
}
