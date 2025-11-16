import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallSkuOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSkuOption";

export async function test_api_shopping_mall_customer_shopping_mall_sku_option_creation_by_customer(
  connection: api.IConnection,
) {
  // 1. Register a new customer account via /auth/customer/join
  const customerCreateBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    full_name: RandomGenerator.name(2),
    ip: null,
    href: "https://example.com/signup",
    referrer: "https://example.com/landing",
  } satisfies IShoppingMallCustomer.ICreate;
  const customer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerCreateBody,
    });
  typia.assert(customer);

  // 2. Prepare SKU option creation data
  const skuOptionCreateBody = {
    code: `${RandomGenerator.alphaNumeric(4).toUpperCase()}${RandomGenerator.alphaNumeric(3).toUpperCase()}`,
    name: RandomGenerator.name(2),
    priceAdjustment: typia.random<
      number & tags.Minimum<-999999999> & tags.Maximum<999999999>
    >(),
    groupCode: `GRP${RandomGenerator.alphaNumeric(3).toUpperCase()}`,
    deletedAt: null,
  } satisfies IShoppingMallSkuOption.ICreate;

  // 3. Create SKU option using authenticated customer connection
  const skuOption: IShoppingMallSkuOption =
    await api.functional.shoppingMall.customer.shoppingMallSkuOptions.create(
      connection,
      { body: skuOptionCreateBody },
    );
  typia.assert(skuOption);

  // 4. Validate the returned SKU option
  TestValidator.equals(
    "SKU option code matches input",
    skuOption.code,
    skuOptionCreateBody.code,
  );
  TestValidator.equals(
    "SKU option name matches input",
    skuOption.name,
    skuOptionCreateBody.name,
  );
  TestValidator.equals(
    "SKU option priceAdjustment matches input",
    skuOption.priceAdjustment,
    skuOptionCreateBody.priceAdjustment,
  );
  TestValidator.equals(
    "SKU option groupCode matches input",
    skuOption.groupCode,
    skuOptionCreateBody.groupCode,
  );

  // 5. Validate timestamps are well formatted ISO strings
  TestValidator.predicate(
    "SKU option createdAt is ISO 8601 string",
    typeof skuOption.createdAt === "string" &&
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})?$/.test(
        skuOption.createdAt,
      ),
  );
  TestValidator.predicate(
    "SKU option updatedAt is ISO 8601 string",
    typeof skuOption.updatedAt === "string" &&
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})?$/.test(
        skuOption.updatedAt,
      ),
  );

  // 6. Validate deletedAt is null
  TestValidator.equals(
    "SKU option deletedAt is null",
    skuOption.deletedAt,
    null,
  );
}
