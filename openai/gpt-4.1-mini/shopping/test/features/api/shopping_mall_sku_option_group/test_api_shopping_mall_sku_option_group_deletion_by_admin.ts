import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallSkuOptionGroup } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSkuOptionGroup";

export async function test_api_shopping_mall_sku_option_group_deletion_by_admin(
  connection: api.IConnection,
) {
  // 1. Authenticate as admin by join
  const adminCreateBody = {
    email: `${RandomGenerator.alphaNumeric(8)}@company.com`,
    name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(12),
    phone_number: null,
    role: "superadmin",
  } satisfies IShoppingMallAdmin.ICreate;

  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminCreateBody,
    });
  typia.assert(admin);

  // 2. Create a new SKU Option Group
  const skuOptionGroupCreate = {
    code: `code${RandomGenerator.alphaNumeric(6)}`,
    name: RandomGenerator.name(),
    description: null,
  } satisfies IShoppingMallSkuOptionGroup.ICreate;

  const skuOptionGroup: IShoppingMallSkuOptionGroup =
    await api.functional.shoppingMall.admin.shoppingMallSkuOptionGroups.create(
      connection,
      {
        body: skuOptionGroupCreate,
      },
    );
  typia.assert(skuOptionGroup);

  // 3. Delete the newly created SKU Option Group by 'code'
  await api.functional.shoppingMall.admin.shoppingMallSkuOptionGroups.eraseSkuOptionGroup(
    connection,
    {
      code: skuOptionGroup.code,
    },
  );

  // 4. Validate that the SKU Option Group is deleted and no longer accessible
  await TestValidator.error(
    "deleted SKU Option Group is no longer accessible",
    async () => {
      await api.functional.shoppingMall.admin.shoppingMallSkuOptionGroups.eraseSkuOptionGroup(
        connection,
        {
          code: skuOptionGroup.code,
        },
      );
    },
  );
}
