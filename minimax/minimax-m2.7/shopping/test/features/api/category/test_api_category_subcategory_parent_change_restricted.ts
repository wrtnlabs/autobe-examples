import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";
import { generate_random_ecommerce_mall_admin_admin_categories_create } from "../../../generate/generate_random_ecommerce_mall_admin_admin_categories_create";
import { prepare_random_ecommerce_mall_category } from "../../../prepare/prepare_random_ecommerce_mall_category";

export async function test_api_category_subcategory_parent_change_restricted(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a super administrator account
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {});
  // 2. Create two top-level parent categories
  const electronicsCategory =
    await api.functional.ecommerceMall.admin.admin.categories.create(
      superAdminConnection,
      {
        body: {
          name: "Electronics",
          description: "Electronic devices and gadgets",
        } satisfies IEcommerceMallCategory.ICreate,
      },
    );
  typia.assert(electronicsCategory);
  const homeAppliancesCategory =
    await api.functional.ecommerceMall.admin.admin.categories.create(
      superAdminConnection,
      {
        body: {
          name: "Home Appliances",
          description: "Home appliances and kitchen equipment",
        } satisfies IEcommerceMallCategory.ICreate,
      },
    );
  typia.assert(homeAppliancesCategory);
  // 3. Create a subcategory under 'Electronics' named 'Smartphones'
  const smartphonesCategory =
    await api.functional.ecommerceMall.admin.admin.categories.create(
      superAdminConnection,
      {
        body: {
          name: "Smartphones",
          description: "Mobile phones and accessories",
          parent_id: electronicsCategory.id,
        } satisfies IEcommerceMallCategory.ICreate,
      },
    );
  typia.assert(smartphonesCategory);
  // Validate the subcategory was created under 'Electronics'
  TestValidator.equals(
    "subcategory parent is Electronics",
    smartphonesCategory.parent?.id,
    electronicsCategory.id,
  );
  // 4. Attempt to change the parent of the subcategory to 'Home Appliances'
  // This should fail - subcategories cannot have their parent changed
  await TestValidator.error(
    "subcategory parent change should be rejected",
    async () =>
      await api.functional.ecommerceMall.superAdmin.admin.categories.update(
        superAdminConnection,
        {
          categoryId: smartphonesCategory.id,
          body: {
            parentId: homeAppliancesCategory.id,
          } satisfies IEcommerceMallCategory.IUpdate,
        },
      ),
  );
}
