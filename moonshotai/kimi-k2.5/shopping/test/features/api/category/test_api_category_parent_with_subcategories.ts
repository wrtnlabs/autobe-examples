import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { generate_random_ecommerce_mall_admin_categories_create } from "../../../generate/generate_random_ecommerce_mall_admin_categories_create";
import { prepare_random_ecommerce_mall_category } from "../../../prepare/prepare_random_ecommerce_mall_category";

export async function test_api_category_parent_with_subcategories(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as admin
  const adminConnection: api.IConnection = { host: connection.host };
  const adminCredentials: IEcommerceMallAdmin.IJoin = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: typia.random<string & tags.Format<"ipv4">>(),
  };
  await authorize_admin_join(adminConnection, { body: adminCredentials });
  // 2. Create parent category (top-level, no parentId)
  const parentCategory =
    await generate_random_ecommerce_mall_admin_categories_create(
      adminConnection,
      {
        body: {
          name: RandomGenerator.name(),
          description: RandomGenerator.paragraph({ sentences: 2 }),
          parentId: null,
        } satisfies IEcommerceMallCategory.ICreate,
      },
    );
  typia.assert(parentCategory);
  // 3. Create subcategories with names that test ascending order
  // Create 'Zebra' first, 'Alpha' second - to verify alphabetical ordering works
  const subcategoryZebra =
    await generate_random_ecommerce_mall_admin_categories_create(
      adminConnection,
      {
        body: {
          name: "Zebra Electronics",
          description: RandomGenerator.paragraph({ sentences: 2 }),
          parentId: parentCategory.id,
        } satisfies IEcommerceMallCategory.ICreate,
      },
    );
  typia.assert(subcategoryZebra);
  const subcategoryAlpha =
    await generate_random_ecommerce_mall_admin_categories_create(
      adminConnection,
      {
        body: {
          name: "Apple Gadgets",
          description: RandomGenerator.paragraph({ sentences: 2 }),
          parentId: parentCategory.id,
        } satisfies IEcommerceMallCategory.ICreate,
      },
    );
  typia.assert(subcategoryAlpha);
  // 4. Retrieve parent category
  const retrievedParent = await api.functional.ecommerceMall.categories.at(
    adminConnection,
    {
      categoryId: parentCategory.id,
    },
  );
  typia.assert(retrievedParent);
  // 5. Verify response structure and values
  TestValidator.equals(
    "parent category id matches",
    retrievedParent.id,
    parentCategory.id,
  );
  TestValidator.equals(
    "parent category name matches",
    retrievedParent.name,
    parentCategory.name,
  );
  TestValidator.equals(
    "parent category description matches",
    retrievedParent.description,
    parentCategory.description,
  );
  TestValidator.predicate(
    "parent field is null for top-level category",
    retrievedParent.parent === null,
  );
  TestValidator.predicate(
    "parentId is null for top-level category",
    retrievedParent.parentId === null,
  );
  // 6. Verify subcategories array
  TestValidator.equals(
    "subcategories count is 2",
    retrievedParent.subcategories.length,
    2,
  );
  // 7. Verify subcategories are ordered by name ascending (Apple should come before Zebra)
  const subcategoryNames = retrievedParent.subcategories.map((sub) => sub.name);
  const sortedNames = [...subcategoryNames].sort((a, b) => a.localeCompare(b));
  TestValidator.equals(
    "subcategories are ordered by name ascending",
    subcategoryNames,
    sortedNames,
  );
  // 8. Verify each subcategory has correct structure
  for (const subcategory of retrievedParent.subcategories) {
    typia.assert(subcategory);
    TestValidator.predicate(
      `subcategory ${subcategory.name} has correct parentId`,
      subcategory.parentId === parentCategory.id,
    );
  }
  // 9. Verify both subcategories are present
  const subcategoryIds = retrievedParent.subcategories.map((sub) => sub.id);
  TestValidator.predicate(
    "subcategoryZebra is in subcategories",
    subcategoryIds.includes(subcategoryZebra.id),
  );
  TestValidator.predicate(
    "subcategoryAlpha is in subcategories",
    subcategoryIds.includes(subcategoryAlpha.id),
  );
}
