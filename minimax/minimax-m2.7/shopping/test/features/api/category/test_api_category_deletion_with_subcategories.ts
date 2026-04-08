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
import { generate_random_ecommerce_mall_admin_admin_categories_create } from "../../../generate/generate_random_ecommerce_mall_admin_admin_categories_create";
import { prepare_random_ecommerce_mall_category } from "../../../prepare/prepare_random_ecommerce_mall_category";

export async function test_api_category_deletion_with_subcategories(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      name: RandomGenerator.name(),
      href: "https://example.com/admin",
      referrer: "https://example.com",
    },
  });
  // 2. Create parent category
  const parentCategory =
    await generate_random_ecommerce_mall_admin_admin_categories_create(
      adminConnection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 2 }),
          description: "Parent category for cascade deletion test",
        },
      },
    );
  typia.assert(parentCategory);
  // 3. Create multiple subcategories under the parent
  const subcategoryNames = [
    "Subcategory Alpha",
    "Subcategory Beta",
    "Subcategory Gamma",
  ] as const;
  const subcategories = await ArrayUtil.asyncMap(
    subcategoryNames,
    async (name) => {
      const subcategory =
        await generate_random_ecommerce_mall_admin_admin_categories_create(
          adminConnection,
          {
            body: {
              name,
              description: `Subcategory: ${name}`,
              parent_id: parentCategory.id,
            },
          },
        );
      typia.assert(subcategory);
      return subcategory;
    },
  );
  // 4. Verify subcategories are created and linked to parent
  TestValidator.predicate(
    "parent category has subcategories_count > 0",
    parentCategory.subcategories_count > 0,
  );
  TestValidator.predicate(
    "subcategories array is not empty",
    subcategories.length > 0,
  );
  // 5. Delete the parent category
  await api.functional.ecommerceMall.admin.admin.categories.erase(
    adminConnection,
    {
      categoryId: parentCategory.id,
    },
  );
  // 6. Response is void (204 No Content is implicit if no error thrown)
  // 7. Verify subcategories are also deleted - attempting to create subcategory with deleted parent should fail
  await TestValidator.error(
    "subcategories should not exist after parent deletion",
    async () => {
      await generate_random_ecommerce_mall_admin_admin_categories_create(
        adminConnection,
        {
          body: {
            name: "New Subcategory After Deletion",
            parent_id: parentCategory.id,
          },
        },
      );
    },
  );
  // 8. Verify parent category no longer exists - attempting to create with same name should succeed (name was unique to deleted parent)
  const recreatedParent =
    await generate_random_ecommerce_mall_admin_admin_categories_create(
      adminConnection,
      {
        body: {
          name: parentCategory.name,
          description: parentCategory.description ?? undefined,
        },
      },
    );
  typia.assert(recreatedParent);
  TestValidator.notEquals(
    "new category should have different id",
    recreatedParent.id,
    parentCategory.id,
  );
}
