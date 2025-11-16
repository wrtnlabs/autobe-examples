import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallSkuOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSkuOption";
import type { IShoppingMallSkuOptionGroup } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSkuOptionGroup";

/**
 * Test the complete workflow of creating a new SKU option by an admin user.
 *
 * 1. Register and authenticate a new admin user.
 * 2. Create a new SKU option group.
 * 3. Create a new SKU option under the option group.
 * 4. Validate that the SKU option creation response includes expected properties
 *    and linkage.
 */
export async function test_api_shopping_mall_sku_option_creation_by_admin(
  connection: api.IConnection,
) {
  // Step 1: Register a new admin
  const adminCreateBody = {
    email: typia.random<string & tags.Format<"email">>(),
    name: RandomGenerator.name(),
    password: "ComplexPassword123!",
    role: "admin" as const,
    phone_number: RandomGenerator.mobile(),
  } satisfies IShoppingMallAdmin.ICreate;

  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminCreateBody,
    });
  typia.assert(admin);

  // Step 2: Create SKU Option Group
  const skuOptionGroupCreateBody = {
    code: RandomGenerator.alphaNumeric(8),
    name: RandomGenerator.name(2),
    description: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies IShoppingMallSkuOptionGroup.ICreate;

  const skuOptionGroup: IShoppingMallSkuOptionGroup =
    await api.functional.shoppingMall.admin.shoppingMallSkuOptionGroups.create(
      connection,
      {
        body: skuOptionGroupCreateBody,
      },
    );
  typia.assert(skuOptionGroup);

  // Step 3: Create SKU Option under the group
  const skuOptionCreateBody = {
    code: RandomGenerator.alphaNumeric(8),
    groupCode: skuOptionGroup.code,
    name: RandomGenerator.name(2),
    priceAdjustment: typia.random<
      number & tags.Minimum<-999999999> & tags.Maximum<999999999>
    >(),
    deletedAt: null,
  } satisfies IShoppingMallSkuOption.ICreate;

  const skuOption: IShoppingMallSkuOption =
    await api.functional.shoppingMall.admin.shoppingMallSkuOptions.create(
      connection,
      {
        body: skuOptionCreateBody,
      },
    );
  typia.assert(skuOption);

  // Step 4: Validate SKU Option data
  TestValidator.equals(
    "sku option group code linked",
    skuOption.groupCode,
    skuOptionGroup.code,
  );
  TestValidator.equals(
    "sku option code matches",
    skuOption.code,
    skuOptionCreateBody.code,
  );
  TestValidator.equals(
    "sku option name matches",
    skuOption.name,
    skuOptionCreateBody.name,
  );
  TestValidator.equals(
    "sku option price adjustment matches",
    skuOption.priceAdjustment,
    skuOptionCreateBody.priceAdjustment,
  );
}
