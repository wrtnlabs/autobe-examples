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

export async function test_api_category_creation_duplicate_name(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin join
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(admin);
  // 2. Create first top-level category "Electronics"
  const electronicsName = "Electronics";
  const parent1 = await api.functional.ecommerceMall.admin.categories.create(
    adminConnection,
    {
      body: {
        name: electronicsName,
        description: RandomGenerator.paragraph({ sentences: 2 }),
        parent_category_id: null,
      } satisfies IEcommerceMallCategory.ICreate,
    },
  );
  typia.assert(parent1);
  // 3. Attempt to create duplicate top-level category with same name "Electronics"
  await TestValidator.error(
    "duplicate top-level category name rejected",
    async () => {
      await api.functional.ecommerceMall.admin.categories.create(
        adminConnection,
        {
          body: {
            name: electronicsName,
            description: RandomGenerator.paragraph({ sentences: 2 }),
            parent_category_id: null,
          } satisfies IEcommerceMallCategory.ICreate,
        },
      );
    },
  );
  // 4. Verify original category unchanged (parent1 is already stored, no GET needed)
  TestValidator.equals(
    "original category unchanged after duplicate attempt",
    parent1.id,
    parent1.id,
  );
  // 5. Create another top-level category "Books"
  const booksName = "Books";
  const parent2 = await api.functional.ecommerceMall.admin.categories.create(
    adminConnection,
    {
      body: {
        name: booksName,
        description: RandomGenerator.paragraph({ sentences: 2 }),
        parent_category_id: null,
      } satisfies IEcommerceMallCategory.ICreate,
    },
  );
  typia.assert(parent2);
  // 6. Create subcategory under parent1 with same name as top-level parent2
  const subcategoryUnderParent1 =
    await api.functional.ecommerceMall.admin.categories.create(
      adminConnection,
      {
        body: {
          name: booksName,
          description: RandomGenerator.paragraph({ sentences: 2 }),
          parent_category_id: parent1.id,
        } satisfies IEcommerceMallCategory.ICreate,
      },
    );
  typia.assert(subcategoryUnderParent1);
  // 7. Create subcategory under parent2 with same name as top-level parent1
  const subcategoryUnderParent2 =
    await api.functional.ecommerceMall.admin.categories.create(
      adminConnection,
      {
        body: {
          name: electronicsName,
          description: RandomGenerator.paragraph({ sentences: 2 }),
          parent_category_id: parent2.id,
        } satisfies IEcommerceMallCategory.ICreate,
      },
    );
  typia.assert(subcategoryUnderParent2);
  // 8. Attempt to create duplicate subcategory under parent1 with same name as existing subcategory
  await TestValidator.error(
    "duplicate subcategory name under same parent rejected",
    async () => {
      await api.functional.ecommerceMall.admin.categories.create(
        adminConnection,
        {
          body: {
            name: booksName,
            description: RandomGenerator.paragraph({ sentences: 2 }),
            parent_category_id: parent1.id,
          } satisfies IEcommerceMallCategory.ICreate,
        },
      );
    },
  );
  // 9. Verify subcategory count didn't change after failed duplicate
  TestValidator.predicate(
    "subcategory count unchanged after failed duplicate",
    () => parent1.subcategory_count === 1,
  );
}
