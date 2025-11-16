import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallSkuAttribute } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSkuAttribute";
import type { IShoppingMallSkuAttributeConfigurations } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSkuAttributeConfigurations";

/**
 * Validate the creation of a new shopping mall SKU attribute by a registered
 * customer.
 *
 * This test covers the entire flow starting from customer registration (join)
 * to successfully creating a SKU attribute with valid attribute details.
 *
 * Process:
 *
 * 1. Customer joins (registration) using email, password, and full_name.
 * 2. The authenticated customer creates a new SKU attribute with unique code,
 *    name, type, and configuration including options and required flag.
 * 3. Assert that the returned SKU attribute contains an id, correct properties,
 *    and timestamps.
 */
export async function test_api_shopping_mall_customer_shopping_mall_sku_attributes_creation_by_customer(
  connection: api.IConnection,
) {
  // 1. Register a new customer
  const createCustomerBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(10),
    full_name: RandomGenerator.name(),
    href: "https://example.com/signup",
    referrer: "https://example.com",
  } satisfies IShoppingMallCustomer.ICreate;

  const customer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: createCustomerBody,
    });
  typia.assert(customer);

  // 2. Create a valid SKU attribute
  const skuAttrCreateBody = {
    code: `${RandomGenerator.alphaNumeric(5).toUpperCase()}_CODE`,
    name: RandomGenerator.name(),
    type: "string",
    configuration: {
      options: ArrayUtil.repeat(
        typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<5>
        >(),
        () => RandomGenerator.name(),
      ),
      required: true,
    },
  } satisfies IShoppingMallSkuAttribute.ICreate;

  const createdAttribute: IShoppingMallSkuAttribute =
    await api.functional.shoppingMall.customer.shoppingMallSkuAttributes.create(
      connection,
      { body: skuAttrCreateBody },
    );
  typia.assert(createdAttribute);

  // 3. Validate response properties
  TestValidator.predicate(
    "SKU attribute id exists",
    typeof createdAttribute.id === "string" && createdAttribute.id.length > 0,
  );
  TestValidator.equals(
    "SKU attribute code matches",
    createdAttribute.code,
    skuAttrCreateBody.code,
  );
  TestValidator.equals(
    "SKU attribute name matches",
    createdAttribute.name,
    skuAttrCreateBody.name,
  );
  TestValidator.equals(
    "SKU attribute type matches",
    createdAttribute.type,
    skuAttrCreateBody.type,
  );
  TestValidator.equals(
    "SKU attribute configuration options match",
    createdAttribute.configuration.options,
    skuAttrCreateBody.configuration.options,
  );
  TestValidator.equals(
    "SKU attribute configuration required flag matches",
    createdAttribute.configuration.required,
    skuAttrCreateBody.configuration.required,
  );

  TestValidator.predicate(
    "SKU attribute created_at timestamp exists",
    typeof createdAttribute.created_at === "string" &&
      createdAttribute.created_at.length > 0,
  );

  TestValidator.predicate(
    "SKU attribute updated_at timestamp exists",
    typeof createdAttribute.updated_at === "string" &&
      createdAttribute.updated_at.length > 0,
  );
}
