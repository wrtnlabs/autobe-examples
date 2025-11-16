import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSkuOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSkuOption";

export async function test_api_shopping_mall_sku_option_update_by_seller(
  connection: api.IConnection,
) {
  // 1. Seller signs up
  const sellerCreateBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "password1234",
    name: RandomGenerator.name(),
  } satisfies IShoppingMallSeller.ICreate;
  const seller: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerCreateBody,
    });
  typia.assert(seller);

  // 2. Seller creates SKU option (preparation for update)
  const skuOptionCreateBody = {
    code: RandomGenerator.alphaNumeric(8),
    groupCode: RandomGenerator.alphaNumeric(6),
    name: RandomGenerator.name(),
    priceAdjustment: typia.random<
      number & tags.Minimum<-999999999> & tags.Maximum<999999999>
    >(),
  } satisfies IShoppingMallSkuOption.ICreate;
  const createdSkuOption: IShoppingMallSkuOption =
    await api.functional.shoppingMall.customer.shoppingMallSkuOptions.create(
      connection,
      {
        body: skuOptionCreateBody,
      },
    );
  typia.assert(createdSkuOption);
  TestValidator.equals(
    "SKU option code should match",
    createdSkuOption.code,
    skuOptionCreateBody.code,
  );

  // 3. Customer signs up
  const customerCreateBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "password1234",
    full_name: RandomGenerator.name(),
    href: "https://example.com/signup",
    referrer: "https://google.com",
  } satisfies IShoppingMallCustomer.ICreate;
  const customer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerCreateBody,
    });
  typia.assert(customer);

  // 4. Customer login to simulate multi-actor environment
  const customerLoginBody = {
    email: customerCreateBody.email,
    password: customerCreateBody.password,
    href: "https://example.com/login",
    referrer: "https://google.com",
  } satisfies IShoppingMallCustomer.ILogin;
  const customerLogin: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.login(connection, {
      body: customerLoginBody,
    });
  typia.assert(customerLogin);

  // 5. Seller login for actor switching
  const sellerLoginBody = {
    email: sellerCreateBody.email,
    password: sellerCreateBody.password,
    href: "https://example.com/login",
    referrer: "https://google.com",
  } satisfies IShoppingMallSeller.ILogin;
  const sellerLogin: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerLoginBody,
    });
  typia.assert(sellerLogin);

  // 6. Seller updates SKU option
  const skuOptionUpdateBody = {
    name: RandomGenerator.name(),
    priceAdjustment: typia.random<
      number & tags.Minimum<-999999999> & tags.Maximum<999999999>
    >(),
  } satisfies IShoppingMallSkuOption.IUpdate;
  const updatedSkuOption: IShoppingMallSkuOption =
    await api.functional.shoppingMall.customer.shoppingMallSkuOptions.update(
      connection,
      {
        code: createdSkuOption.code,
        body: skuOptionUpdateBody,
      },
    );
  typia.assert(updatedSkuOption);

  TestValidator.equals(
    "SKU option updated code should match",
    updatedSkuOption.code,
    createdSkuOption.code,
  );
  TestValidator.equals(
    "SKU option updated name should match",
    updatedSkuOption.name,
    skuOptionUpdateBody.name,
  );
  TestValidator.equals(
    "SKU option updated price adjustment should match",
    updatedSkuOption.priceAdjustment,
    skuOptionUpdateBody.priceAdjustment,
  );
}
