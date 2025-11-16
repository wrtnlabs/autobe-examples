import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSkuAttributeValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSkuAttributeValue";

export async function test_api_customer_get_sku_attribute_value_by_id(
  connection: api.IConnection,
) {
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const seller = await api.functional.auth.seller.join(connection, {
    body: {
      email: sellerEmail,
      password: "1234",
      name: RandomGenerator.name(),
    } satisfies IShoppingMallSeller.ICreate,
  });
  typia.assert(seller);

  await api.functional.auth.seller.login(connection, {
    body: {
      email: sellerEmail,
      password: "1234",
      ip: null,
      href: "https://example.com/seller/login",
      referrer: "https://example.com/seller/referrer",
    } satisfies IShoppingMallSeller.ILogin,
  });

  const skuValueCreate = {
    shopping_mall_sku_attribute_id: typia.random<
      string & tags.Format<"uuid">
    >(),
    value: RandomGenerator.paragraph({ sentences: 1, wordMin: 3, wordMax: 10 }),
    code: RandomGenerator.alphaNumeric(10),
    description: null,
  } satisfies IShoppingMallSkuAttributeValue.ICreate;

  const skuValueCreated =
    await api.functional.shoppingMall.seller.shoppingMallSkuAttributeValues.create(
      connection,
      {
        body: skuValueCreate,
      },
    );
  typia.assert(skuValueCreated);

  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customer = await api.functional.auth.customer.join(connection, {
    body: {
      email: customerEmail,
      password: "1234",
      full_name: RandomGenerator.name(),
      ip: null,
      href: "https://example.com/customer/join",
      referrer: "https://example.com/customer/referrer",
    } satisfies IShoppingMallCustomer.ICreate,
  });
  typia.assert(customer);

  await api.functional.auth.customer.login(connection, {
    body: {
      email: customerEmail,
      password: "1234",
      ip: null,
      href: "https://example.com/customer/login",
      referrer: "https://example.com/customer/referrer",
    } satisfies IShoppingMallCustomer.ILogin,
  });

  const skuValueFetched =
    await api.functional.shoppingMall.customer.shoppingMallSkuAttributeValues.at(
      connection,
      {
        id: skuValueCreated.id,
      },
    );
  typia.assert(skuValueFetched);

  TestValidator.equals(
    "sku attribute value.id",
    skuValueFetched.id,
    skuValueCreated.id,
  );
  TestValidator.equals(
    "sku attribute value.shopping_mall_sku_attribute_id",
    skuValueFetched.shopping_mall_sku_attribute_id,
    skuValueCreated.shopping_mall_sku_attribute_id,
  );
  TestValidator.equals(
    "sku attribute value.value",
    skuValueFetched.value,
    skuValueCreated.value,
  );
  TestValidator.equals(
    "sku attribute value.code",
    skuValueFetched.code,
    skuValueCreated.code,
  );
  TestValidator.equals(
    "sku attribute value.description",
    skuValueFetched.description,
    skuValueCreated.description,
  );
}
