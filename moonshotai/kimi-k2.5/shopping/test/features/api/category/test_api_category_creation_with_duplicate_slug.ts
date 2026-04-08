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

export async function test_api_category_creation_with_duplicate_slug(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Authenticate as admin
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {},
  });
  typia.assert(admin);
  // Step 2: Create initial category with specific name
  const categoryName = "Electronics";
  const createBody = {
    name: categoryName,
    description: "Electronic devices and accessories",
  } satisfies IEcommerceMallCategory.ICreate;
  const category = await api.functional.ecommerceMall.admin.categories.create(
    adminConnection,
    {
      body: createBody,
    },
  );
  typia.assert(category);
  TestValidator.equals("category name matches", category.name, categoryName);
  // Step 3: Attempt to create duplicate category with same name - should throw error
  await TestValidator.error(
    "duplicate category name should throw error",
    async () => {
      await api.functional.ecommerceMall.admin.categories.create(
        adminConnection,
        {
          body: {
            name: categoryName, // Same name
            description: "Duplicate category attempt",
          } satisfies IEcommerceMallCategory.ICreate,
        },
      );
    },
  );
}
