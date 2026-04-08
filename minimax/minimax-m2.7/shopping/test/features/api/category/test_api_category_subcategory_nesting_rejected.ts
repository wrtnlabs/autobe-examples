import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallCategory";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { generate_random_ecommerce_mall_admin_admin_categories_create } from "../../../generate/generate_random_ecommerce_mall_admin_admin_categories_create";
import { prepare_random_ecommerce_mall_category } from "../../../prepare/prepare_random_ecommerce_mall_category";

/**
 * Test rejection of creating a subcategory under another subcategory.
 *
 * Validates the business rule that categories support only one level of nesting.
 * The system should reject attempts to create a subcategory under another subcategory,
 * ensuring that category hierarchy is limited to one level deep.
 *
 * 1. Administrator authenticates via admin join endpoint.
 * 2. Retrieves existing top-level categories to find a suitable parent.
 * 3. Creates a first-level subcategory under the top-level category.
 * 4. Attempts to create a second-level subcategory under the first-level subcategory.
 * 5. Validates the system rejects this request with error response (400 or 422).
 *
 * This test ensures data integrity by preventing deep category hierarchies.
 */
export async function test_api_category_subcategory_nesting_rejected(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Authenticate as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallAdmin.IJoin,
  });
  // Step 2: Retrieve existing top-level categories
  const categoriesPage = await api.functional.ecommerceMall.categories.index(
    adminConnection,
    {
      body: {} satisfies IEcommerceMallCategory.IRequest,
    },
  );
  typia.assert(categoriesPage);
  // Get a top-level category or create one if none exists
  let topLevelCategoryId: string;
  if (categoriesPage.data.length > 0) {
    topLevelCategoryId = categoriesPage.data[0].id;
  } else {
    // Create a top-level category to use as parent
    const topLevelCategory =
      await api.functional.ecommerceMall.admin.admin.categories.create(
        adminConnection,
        {
          body: {
            name: RandomGenerator.paragraph({ sentences: 1 }),
            description: "Top-level category for testing",
          } satisfies IEcommerceMallCategory.ICreate,
        },
      );
    typia.assert(topLevelCategory);
    topLevelCategoryId = topLevelCategory.id;
  }
  // Step 3: Create first-level subcategory
  const firstLevelSubcategory =
    await api.functional.ecommerceMall.admin.admin.categories.create(
      adminConnection,
      {
        body: {
          name: "Smartphones",
          parent_id: topLevelCategoryId,
        } satisfies IEcommerceMallCategory.ICreate,
      },
    );
  typia.assert(firstLevelSubcategory);
  // Step 4: Extract the ID of the newly created first-level subcategory
  TestValidator.equals(
    "first-level subcategory has valid parent",
    firstLevelSubcategory.parent?.id,
    topLevelCategoryId,
  );
  // Step 5 & 6: Attempt to create second-level subcategory and validate rejection
  await TestValidator.httpError(
    "second-level subcategory nesting rejected",
    [400, 422],
    async () =>
      await api.functional.ecommerceMall.admin.admin.categories.create(
        adminConnection,
        {
          body: {
            name: "AndroidPhones",
            parent_id: firstLevelSubcategory.id,
          } satisfies IEcommerceMallCategory.ICreate,
        },
      ),
  );
}
