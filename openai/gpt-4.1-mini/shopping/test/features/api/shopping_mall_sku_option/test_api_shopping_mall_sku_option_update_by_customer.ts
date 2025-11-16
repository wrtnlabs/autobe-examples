import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallSkuOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSkuOption";

export async function test_api_shopping_mall_sku_option_update_by_customer(
  connection: api.IConnection,
) {
  // 1. Customer joins (registers) to establish an authenticated user context
  const customerCreateBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(10),
    full_name: RandomGenerator.name(),
    ip: null,
    href: `https://example.com/signup`,
    referrer: `https://example.com/landing`,
  } satisfies IShoppingMallCustomer.ICreate;

  const customer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerCreateBody,
    });
  typia.assert(customer);

  // 2. Create a new SKU Option
  // SKU option code must be unique, use random alpha numeric
  const skuOptionCreateBody = {
    code: RandomGenerator.alphaNumeric(12).toLowerCase(),
    groupCode: "default-group",
    name: RandomGenerator.name(),
    priceAdjustment: typia.random<
      number & tags.Minimum<-999999999> & tags.Maximum<999999999>
    >(),
    deletedAt: null,
  } satisfies IShoppingMallSkuOption.ICreate;

  const skuOptionCreated: IShoppingMallSkuOption =
    await api.functional.shoppingMall.customer.shoppingMallSkuOptions.create(
      connection,
      {
        body: skuOptionCreateBody,
      },
    );
  typia.assert(skuOptionCreated);

  TestValidator.equals(
    "saved sku option code matches create input",
    skuOptionCreated.code,
    skuOptionCreateBody.code,
  );

  // 3. Update the SKU option (change name and priceAdjustment)
  // New name and new priceAdjustment, keeping same groupCode and code
  const skuOptionUpdateBody = {
    name: RandomGenerator.name(),
    priceAdjustment: typia.random<
      number & tags.Minimum<-999999999> & tags.Maximum<999999999>
    >(),
    deletedAt: null,
  } satisfies IShoppingMallSkuOption.IUpdate;

  const skuOptionUpdated: IShoppingMallSkuOption =
    await api.functional.shoppingMall.customer.shoppingMallSkuOptions.update(
      connection,
      {
        code: skuOptionCreated.code,
        body: skuOptionUpdateBody,
      },
    );
  typia.assert(skuOptionUpdated);

  TestValidator.equals(
    "sku option code remains unchanged after update",
    skuOptionUpdated.code,
    skuOptionCreated.code,
  );
  TestValidator.equals(
    "sku option name matches updated value",
    skuOptionUpdated.name,
    skuOptionUpdateBody.name,
  );
  TestValidator.equals(
    "sku option priceAdjustment matches updated value",
    skuOptionUpdated.priceAdjustment,
    skuOptionUpdateBody.priceAdjustment,
  );
  TestValidator.equals(
    "sku option deletedAt remains null",
    skuOptionUpdated.deletedAt,
    null,
  );
}
