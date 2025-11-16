import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallSkuOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSkuOption";
import type { IShoppingMallSkuOptionGroup } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSkuOptionGroup";

export async function test_api_shopping_mall_sku_option_update_by_admin(
  connection: api.IConnection,
) {
  // 1. Admin user signs up
  const adminCreateBody = {
    email: typia.random<string & tags.Format<"email">>(),
    name: RandomGenerator.name(),
    password: "StrongPass123!",
    phone_number: RandomGenerator.mobile(),
    role: "admin",
  } satisfies IShoppingMallAdmin.ICreate;

  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminCreateBody,
    });
  typia.assert(admin);

  // 2. Admin creates a SKU option group
  const groupCreateBody = {
    code: RandomGenerator.alphaNumeric(10),
    name: RandomGenerator.paragraph({ sentences: 2, wordMin: 4, wordMax: 8 }),
    description: RandomGenerator.content({
      paragraphs: 1,
      sentenceMin: 5,
      sentenceMax: 10,
      wordMin: 4,
      wordMax: 8,
    }),
  } satisfies IShoppingMallSkuOptionGroup.ICreate;

  const skuOptionGroup: IShoppingMallSkuOptionGroup =
    await api.functional.shoppingMall.admin.shoppingMallSkuOptionGroups.create(
      connection,
      {
        body: groupCreateBody,
      },
    );
  typia.assert(skuOptionGroup);

  // 3. Admin creates a SKU option under the created group
  const skuOptionCreateBody = {
    code: RandomGenerator.alphaNumeric(12),
    groupCode: skuOptionGroup.code,
    name: RandomGenerator.paragraph({ sentences: 1, wordMin: 4, wordMax: 8 }),
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

  // 4. Admin updates the SKU option's name and price adjustment

  const updatedName = RandomGenerator.paragraph({
    sentences: 1,
    wordMin: 5,
    wordMax: 10,
  });
  const updatedPriceAdjustment = typia.random<
    number & tags.Minimum<-999999999> & tags.Maximum<999999999>
  >();

  const skuOptionUpdateBody = {
    name: updatedName,
    priceAdjustment: updatedPriceAdjustment,
    deletedAt: null,
  } satisfies IShoppingMallSkuOption.IUpdate;

  const updatedSkuOption: IShoppingMallSkuOption =
    await api.functional.shoppingMall.admin.shoppingMallSkuOptions.update(
      connection,
      {
        code: skuOption.code,
        body: skuOptionUpdateBody,
      },
    );
  typia.assert(updatedSkuOption);

  // 5. Validate the update took effect
  TestValidator.equals(
    "SKU option code unchanged",
    updatedSkuOption.code,
    skuOption.code,
  );
  TestValidator.equals(
    "SKU option name updated",
    updatedSkuOption.name,
    updatedName,
  );
  TestValidator.equals(
    "SKU option price adjustment updated",
    updatedSkuOption.priceAdjustment,
    updatedPriceAdjustment,
  );
  TestValidator.equals(
    "SKU option group code unchanged",
    updatedSkuOption.groupCode,
    skuOption.groupCode,
  );
  TestValidator.equals(
    "SKU option deletedAt remains null",
    updatedSkuOption.deletedAt,
    null,
  );
}
