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

export async function test_api_subcategory_update_with_unique_name(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register super admin
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdmin = await authorize_super_admin_join(superAdminConnection, {});
  // 2. Create parent category 'Home Appliances'
  const parentCategory =
    await generate_random_ecommerce_mall_super_admin_categories_create(
      superAdminConnection,
      {
        body: {
          name: "Home Appliances",
          description: "Household appliances for daily use",
        } satisfies IEcommerceMallCategory.ICreate,
      },
    );
  typia.assert(parentCategory);
  TestValidator.equals(
    "parent category has no parent",
    parentCategory.parent,
    null,
  );
  // 3. Create subcategory 'Refrigerators' under parent
  const refrigeratorsSubcategory =
    await generate_random_ecommerce_mall_super_admin_categories_create(
      superAdminConnection,
      {
        body: {
          name: "Refrigerators",
          parent_id: parentCategory.id,
        } satisfies IEcommerceMallCategory.ICreate,
      },
    );
  typia.assert(refrigeratorsSubcategory);
  TestValidator.equals(
    "refrigerators parent matches",
    refrigeratorsSubcategory.parent?.id,
    parentCategory.id,
  );
  // 4. Create subcategory 'Washing Machines' under same parent
  const washingMachinesSubcategory =
    await generate_random_ecommerce_mall_super_admin_categories_create(
      superAdminConnection,
      {
        body: {
          name: "Washing Machines",
          parent_id: parentCategory.id,
        } satisfies IEcommerceMallCategory.ICreate,
      },
    );
  typia.assert(washingMachinesSubcategory);
  TestValidator.equals(
    "washing machines parent matches",
    washingMachinesSubcategory.parent?.id,
    parentCategory.id,
  );
  // 5. Update 'Washing Machines' name to 'Washer-Dryer Combo' via PUT
  const updatedSubcategory =
    await api.functional.ecommerceMall.superAdmin.categories.update(
      superAdminConnection,
      {
        categoryId: washingMachinesSubcategory.id,
        body: {
          name: "Washer-Dryer Combo",
        } satisfies IEcommerceMallCategory.IUpdate,
      },
    );
  typia.assert(updatedSubcategory);
  // 6. Validate successful update
  TestValidator.equals(
    "updated name matches",
    updatedSubcategory.name,
    "Washer-Dryer Combo",
  );
  TestValidator.equals(
    "description unchanged (null)",
    updatedSubcategory.description,
    null,
  );
  TestValidator.equals(
    "parent relationship preserved",
    updatedSubcategory.parent?.id,
    parentCategory.id,
  );
  TestValidator.equals(
    "id unchanged",
    updatedSubcategory.id,
    washingMachinesSubcategory.id,
  );
}
