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

export async function test_api_category_creation_with_parent_category(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_login(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallAdmin.ILogin,
  });
  // 2. Create parent top-level category
  const parentCategory =
    await api.functional.ecommerceMall.admin.categories.create(
      adminConnection,
      {
        body: {
          name: RandomGenerator.paragraph({
            sentences: 1,
            wordMin: 3,
            wordMax: 5,
          }),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IEcommerceMallCategory.ICreate,
      },
    );
  typia.assert(parentCategory);
  TestValidator.equals(
    "parent category has no parent",
    parentCategory.parent,
    null,
  );
  TestValidator.equals(
    "parent category has empty subcategories",
    parentCategory.subcategories.length,
    0,
  );
  // 3. Create subcategory with parent_id pointing to parent category
  const subcategoryName = RandomGenerator.paragraph({
    sentences: 1,
    wordMin: 2,
    wordMax: 4,
  });
  const subcategory =
    await api.functional.ecommerceMall.admin.categories.create(
      adminConnection,
      {
        body: {
          name: subcategoryName,
          description: RandomGenerator.paragraph({ sentences: 1 }),
          parent_id: parentCategory.id,
        } satisfies IEcommerceMallCategory.ICreate,
      },
    );
  typia.assert(subcategory);
  // 4. Validate subcategory has correct parent reference
  TestValidator.equals(
    "subcategory has correct parent_id",
    subcategory.parent?.id,
    parentCategory.id,
  );
  TestValidator.equals(
    "subcategory name matches",
    subcategory.name,
    subcategoryName,
  );
  TestValidator.equals(
    "subcategory has empty subcategories",
    subcategory.subcategories.length,
    0,
  );
  // 5. Attempt to create sub-subcategory (should be rejected - only one level allowed)
  await TestValidator.error(
    "cannot create sub-subcategory (one-level nesting)",
    async () => {
      await api.functional.ecommerceMall.admin.categories.create(
        adminConnection,
        {
          body: {
            name: RandomGenerator.paragraph({
              sentences: 1,
              wordMin: 2,
              wordMax: 3,
            }),
            parent_id: subcategory.id,
          } satisfies IEcommerceMallCategory.ICreate,
        },
      );
    },
  );
}
