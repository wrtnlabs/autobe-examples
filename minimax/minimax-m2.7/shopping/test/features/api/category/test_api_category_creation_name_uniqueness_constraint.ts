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

export async function test_api_category_creation_name_uniqueness_constraint(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Admin1234!" as string & tags.Format<"password">,
      name: RandomGenerator.name(),
      href: "https://test.example.com/admin",
      referrer: "https://test.example.com/",
    },
  });
  typia.assert(admin);
  // 2. Create first category 'Electronics'
  const categoryName = "Electronics";
  const firstCategory =
    await api.functional.ecommerceMall.admin.admin.categories.create(
      adminConnection,
      {
        body: {
          name: categoryName,
          description: "Electronic devices and gadgets",
        } satisfies IEcommerceMallCategory.ICreate,
      },
    );
  typia.assert(firstCategory);
  TestValidator.equals(
    "first category name matches",
    firstCategory.name,
    categoryName,
  );
  // 3. Retrieve categories list to confirm first category exists
  const categoriesAfterFirst =
    await api.functional.ecommerceMall.admin.categories.index(adminConnection, {
      body: {
        name: categoryName,
      } satisfies IEcommerceMallCategory.IRequest,
    });
  typia.assert(categoriesAfterFirst);
  TestValidator.equals(
    "one category with name exists",
    categoriesAfterFirst.data.length,
    1,
  );
  TestValidator.equals(
    "first category id matches",
    categoriesAfterFirst.data[0].id,
    firstCategory.id,
  );
  // 4. Attempt to create second category with same name - should fail
  await TestValidator.error("duplicate category name should fail", async () => {
    await api.functional.ecommerceMall.admin.admin.categories.create(
      adminConnection,
      {
        body: {
          name: categoryName,
          description: "Another electronics category",
        } satisfies IEcommerceMallCategory.ICreate,
      },
    );
  });
  // 5. Verify only the first category exists in the system
  const finalCategories =
    await api.functional.ecommerceMall.admin.categories.index(adminConnection, {
      body: {
        name: categoryName,
      } satisfies IEcommerceMallCategory.IRequest,
    });
  typia.assert(finalCategories);
  TestValidator.equals(
    "still only one category with this name",
    finalCategories.data.length,
    1,
  );
  TestValidator.equals(
    "original category still exists",
    finalCategories.data[0].id,
    firstCategory.id,
  );
}
