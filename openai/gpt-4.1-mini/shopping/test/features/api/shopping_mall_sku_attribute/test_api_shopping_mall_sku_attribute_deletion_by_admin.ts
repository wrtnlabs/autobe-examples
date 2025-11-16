import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallSkuAttribute } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSkuAttribute";
import type { IShoppingMallSkuAttributeConfigurations } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSkuAttributeConfigurations";

export async function test_api_shopping_mall_sku_attribute_deletion_by_admin(
  connection: api.IConnection,
) {
  // 1. Admin registration and login
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const password = "strongPassword123";

  const adminCreateBody = {
    email: adminEmail,
    name: RandomGenerator.name(),
    password,
    role: "admin",
  } satisfies IShoppingMallAdmin.ICreate;

  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, { body: adminCreateBody });
  typia.assert(admin);

  await api.functional.auth.admin.login(connection, {
    body: {
      email: adminEmail,
      password,
      ip: null,
      href: "https://localhost/admin/login",
      referrer: "https://localhost",
    } satisfies IShoppingMallAdmin.ILogin,
  });

  // 2. Create a SKU attribute
  const skuAttributeCreateBody = {
    code: RandomGenerator.alphaNumeric(8),
    name: RandomGenerator.name(),
    type: "string",
    configuration: {
      options: [RandomGenerator.name()],
      required: true,
    } satisfies IShoppingMallSkuAttributeConfigurations,
  } satisfies IShoppingMallSkuAttribute.ICreate;

  const skuAttribute: IShoppingMallSkuAttribute =
    await api.functional.shoppingMall.customer.shoppingMallSkuAttributes.create(
      connection,
      { body: skuAttributeCreateBody },
    );
  typia.assert(skuAttribute);

  // 3. Delete the created SKU attribute
  await api.functional.shoppingMall.admin.shoppingMallSkuAttributes.erase(
    connection,
    {
      code: skuAttribute.code,
    },
  );

  // 4. Attempt to delete again to confirm deletion, expect error
  await TestValidator.error(
    "deleting non-existent SKU attribute should fail",
    async () => {
      await api.functional.shoppingMall.admin.shoppingMallSkuAttributes.erase(
        connection,
        {
          code: skuAttribute.code,
        },
      );
    },
  );
}
