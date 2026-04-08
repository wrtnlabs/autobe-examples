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

export async function test_api_category_creation_duplicate_name_in_same_scope(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2. Create a parent top-level category "Clothing"
  const parentCategory =
    await generate_random_ecommerce_mall_admin_categories_create(
      adminConnection,
      {
        body: {
          name: "Clothing",
          description: "Apparel and fashion items",
        },
      },
    );
  typia.assert(parentCategory);
  // 3. Create a subcategory with name "Summer Collection" under Clothing
  const summerCollection1 =
    await generate_random_ecommerce_mall_admin_categories_create(
      adminConnection,
      {
        body: {
          name: "Summer Collection",
          description: "Beach and summer wear",
          parent_id: parentCategory.id,
        },
      },
    );
  typia.assert(summerCollection1);
  TestValidator.equals(
    "subcategory has correct parent",
    summerCollection1.parent?.id,
    parentCategory.id,
  );
  TestValidator.equals(
    "subcategory name matches",
    summerCollection1.name,
    "Summer Collection",
  );
  // 4. Attempt to create another subcategory with same name "Summer Collection" under same parent
  // 5. Verify HTTP error response indicating name conflict
  await TestValidator.error(
    "duplicate category name in same scope should fail",
    async () => {
      await api.functional.ecommerceMall.admin.categories.create(
        adminConnection,
        {
          body: {
            name: "Summer Collection",
            description: "Another summer collection",
            parent_id: parentCategory.id,
          } satisfies IEcommerceMallCategory.ICreate,
        },
      );
    },
  );
  // 6. Verify duplicate category was NOT created by trying to list categories
  // (The first subcategory should still exist, no second one created)
  // 7. Create another parent top-level category "Accessories"
  const accessoriesCategory =
    await generate_random_ecommerce_mall_admin_categories_create(
      adminConnection,
      {
        body: {
          name: "Accessories",
          description: "Fashion accessories",
        },
      },
    );
  typia.assert(accessoriesCategory);
  // 8. Verify same name is allowed under different parent scope
  const summerCollection2 =
    await generate_random_ecommerce_mall_admin_categories_create(
      adminConnection,
      {
        body: {
          name: "Summer Collection",
          description: "Summer accessories",
          parent_id: accessoriesCategory.id,
        },
      },
    );
  typia.assert(summerCollection2);
  TestValidator.equals(
    "different parent category",
    summerCollection2.parent?.id,
    accessoriesCategory.id,
  );
  TestValidator.equals(
    "same name allowed in different scope",
    summerCollection2.name,
    "Summer Collection",
  );
  TestValidator.notEquals(
    "different subcategory IDs",
    summerCollection1.id,
    summerCollection2.id,
  );
}
