import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";
import { generate_random_ecommerce_mall_super_admin_categories_create } from "../../../generate/generate_random_ecommerce_mall_super_admin_categories_create";
import { prepare_random_ecommerce_mall_category } from "../../../prepare/prepare_random_ecommerce_mall_category";

export async function test_api_category_retrieval_subcategory_with_parent_reference(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as superAdmin
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdmin = await authorize_super_admin_join(superAdminConnection, {});
  // 2. Create parent category "Home & Garden"
  const parentCategory =
    await generate_random_ecommerce_mall_super_admin_categories_create(
      superAdminConnection,
      {
        body: {
          name: "Home & Garden" as string & tags.MaxLength<100>,
        } satisfies IEcommerceMallCategory.ICreate,
      },
    );
  typia.assert(parentCategory);
  // 3. Create subcategory "Furniture" under the parent
  const subcategory =
    await generate_random_ecommerce_mall_super_admin_categories_create(
      superAdminConnection,
      {
        body: {
          name: "Furniture" as string & tags.MaxLength<100>,
          parent_id: parentCategory.id,
        } satisfies IEcommerceMallCategory.ICreate,
      },
    );
  typia.assert(subcategory);
  // 4. Retrieve the subcategory using GET /ecommerceMall/categories/{categoryId}
  const category = await api.functional.ecommerceMall.categories.at(
    superAdminConnection,
    {
      categoryId: subcategory.id,
    },
  );
  typia.assert(category);
  // 5. Validate the response
  TestValidator.equals("subcategory id matches", category.id, subcategory.id);
  TestValidator.equals(
    "subcategory name is Furniture",
    category.name,
    "Furniture",
  );
  TestValidator.predicate("parent is not null", category.parent !== null);
  TestValidator.equals(
    "parent id matches parent category",
    category.parent!.id,
    parentCategory.id,
  );
  TestValidator.equals(
    "parent name is Home & Garden",
    category.parent!.name,
    "Home & Garden",
  );
  TestValidator.equals(
    "subcategories array is empty",
    category.subcategories.length,
    0,
  );
}
