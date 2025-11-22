import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconPoliticalDiscussionCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalDiscussionCategory";
import type { IEconPoliticalDiscussionSystemAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalDiscussionSystemAdministrator";
import type { IEconPoliticalDiscussionUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalDiscussionUser";

export async function test_api_category_update_name_and_description(
  connection: api.IConnection,
) {
  // Step 1: Create system administrator account
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

  // Step 2: Create initial category with baseline information
  const initialCategory: IEconPoliticalDiscussionCategory =
    await api.functional.econPoliticalDiscussion.systemAdministrator.categories.create(
      connection,
      {
        body: {
          name: "General Discussion",
          description: "General topics for economic and political discussions",
          display_order: 1,
          is_active: true,
        } satisfies IEconPoliticalDiscussionCategory.ICreate,
      },
    );
  typia.assert(initialCategory);

  // Step 3: Update category name and description
  const updatedCategory: IEconPoliticalDiscussionCategory =
    await api.functional.econPoliticalDiscussion.systemAdministrator.categories.update(
      connection,
      {
        categoryId: initialCategory.id,
        body: {
          name: "Market Analysis",
          description:
            "Comprehensive discussion of economic market trends, analysis, and forecasting",
        } satisfies IEconPoliticalDiscussionCategory.IUpdate,
      },
    );
  typia.assert(updatedCategory);

  // Step 4: Validate that updates were properly applied
  TestValidator.equals(
    "category name updated",
    updatedCategory.name,
    "Market Analysis",
  );
  TestValidator.equals(
    "category description updated",
    updatedCategory.description,
    "Comprehensive discussion of economic market trends, analysis, and forecasting",
  );
  TestValidator.equals(
    "category ID preserved",
    updatedCategory.id,
    initialCategory.id,
  );
  TestValidator.equals(
    "display order preserved",
    updatedCategory.display_order,
    initialCategory.display_order,
  );
  TestValidator.equals(
    "status preserved",
    updatedCategory.status,
    initialCategory.status,
  );
}
