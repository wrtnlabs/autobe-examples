import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformProductCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProductCategory";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_category_update_by_admin(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a new connection for admin authentication
  const adminConnection: api.IConnection = { host: connection.host };
  // Step 2: Authenticate admin using the authorization utility function
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      href: "https://example.com/join",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  // adminConnection.headers is now updated with auth token by authorize function
  // Step 3: Generate a unique category code for the initial category creation
  const categoryCode: string = typia.random<string & tags.Format<"uuid">>();
  // Step 4: Create initial category with random values using the update endpoint (create)
  // Note: Since there is no explicit create endpoint, update is used to create new categories
  // Only the admin can update categories, and those that don't exist will be created with the categoryCode
  const initialCategory =
    await api.functional.communityPlatform.admin.categories.update(
      adminConnection,
      {
        categoryCode, // We use the unique UUID as categoryCode
        body: {
          name: RandomGenerator.paragraph({ sentences: 2 }),
          description: RandomGenerator.content({ paragraphs: 1 }),
          displayOrder: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1>
          >(),
        } satisfies ICommunityPlatformProductCategory.IUpdate,
      },
    );
  typia.assert(initialCategory);
  // Step 5: Verify that the initial category has the expected properties
  TestValidator.equals(
    "category code matches",
    initialCategory.name,
    initialCategory.name,
  );
  TestValidator.equals(
    "category description is set",
    initialCategory.description,
    initialCategory.description,
  );
  TestValidator.equals(
    "category display order is set",
    initialCategory.displayOrder,
    initialCategory.displayOrder,
  );
  // Step 6: Update the category with new values
  const updatedCategory =
    await api.functional.communityPlatform.admin.categories.update(
      adminConnection,
      {
        categoryCode, // Use the same categoryCode to update the existing category
        body: {
          name: RandomGenerator.paragraph({ sentences: 2 }),
          description: RandomGenerator.content({ paragraphs: 2 }),
          displayOrder: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1>
          >(),
        } satisfies ICommunityPlatformProductCategory.IUpdate,
      },
    );
  typia.assert(updatedCategory);
  // Step 7: Validate that the updated category reflects the changes
  // First validate that values were updated (changed)
  TestValidator.notEquals(
    "category name changed",
    updatedCategory.name,
    initialCategory.name,
  );
  TestValidator.notEquals(
    "category description changed",
    updatedCategory.description,
    initialCategory.description,
  );
  TestValidator.notEquals(
    "category display order changed",
    updatedCategory.displayOrder,
    initialCategory.displayOrder,
  );
  // Validate that unrelated fields remain unchanged
  TestValidator.equals(
    "parent category code unchanged",
    updatedCategory.parentCategoryCode,
    initialCategory.parentCategoryCode,
  );
}