import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallSkuOptionGroup } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSkuOptionGroup";

export async function test_api_shopping_mall_sku_option_group_update_by_admin(
  connection: api.IConnection,
) {
  // 1. Register and authenticate as admin user
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const adminPassword: string = "P@ssw0rd!";

  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        name: RandomGenerator.name(3),
        password: adminPassword,
        phone_number: null,
        role: "admin",
      } satisfies IShoppingMallAdmin.ICreate,
    });
  typia.assert(admin);

  // 2. Create SKU Option Group entity as admin for update
  const skuOptionGroupCreateBody = {
    code: RandomGenerator.alphaNumeric(8),
    name: RandomGenerator.name(3),
    description: RandomGenerator.paragraph({ sentences: 5 }),
  } satisfies IShoppingMallSkuOptionGroup.ICreate;

  const createdSkuOptionGroup: IShoppingMallSkuOptionGroup =
    await api.functional.shoppingMall.admin.shoppingMallSkuOptionGroups.create(
      connection,
      {
        body: skuOptionGroupCreateBody,
      },
    );
  typia.assert(createdSkuOptionGroup);

  // 3. Update the SKU Option Group's name and description
  const updateBody = {
    name: RandomGenerator.name(4),
    description: RandomGenerator.paragraph({ sentences: 6 }),
  } satisfies IShoppingMallSkuOptionGroup.IUpdate;

  const updatedSkuOptionGroup: IShoppingMallSkuOptionGroup =
    await api.functional.shoppingMall.admin.shoppingMallSkuOptionGroups.updateSkuOptionGroup(
      connection,
      {
        code: createdSkuOptionGroup.code,
        body: updateBody,
      },
    );
  typia.assert(updatedSkuOptionGroup);

  // 4. Validate that updates are applied
  TestValidator.equals(
    "SKU Option Group code remains same",
    updatedSkuOptionGroup.code,
    createdSkuOptionGroup.code,
  );
  TestValidator.equals(
    "SKU Option Group name is updated",
    updatedSkuOptionGroup.name,
    updateBody.name,
  );
  TestValidator.equals(
    "SKU Option Group description is updated",
    updatedSkuOptionGroup.description,
    updateBody.description,
  );
}
