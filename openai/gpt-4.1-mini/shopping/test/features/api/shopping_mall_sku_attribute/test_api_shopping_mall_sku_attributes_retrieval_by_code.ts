import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallSkuAttribute } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSkuAttribute";
import type { IShoppingMallSkuAttributeConfigurations } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSkuAttributeConfigurations";

export async function test_api_shopping_mall_sku_attributes_retrieval_by_code(
  connection: api.IConnection,
) {
  // 1. Customer joins to get authorization
  const email = `user${RandomGenerator.alphaNumeric(6)}@example.com`;
  const password = "validPassword123";
  const name = RandomGenerator.name();
  const customer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: {
        email: email,
        password: password,
        full_name: name,
        ip: null,
        href: "https://example.com/signup",
        referrer: "https://example.com/referrer",
      } satisfies IShoppingMallCustomer.ICreate,
    });
  typia.assert(customer);

  // 2. Create a SKU attribute using authorized customer
  const sampleCode = `SKU_ATTR_${RandomGenerator.alphaNumeric(8)}`;
  const sampleName = RandomGenerator.name(2);
  const sampleType = RandomGenerator.pick([
    "string",
    "number",
    "boolean",
  ] as const);
  const sampleConfigOptions = ArrayUtil.repeat(3, () =>
    RandomGenerator.alphaNumeric(5),
  );
  const sampleConfigRequired = RandomGenerator.pick([true, false] as const);

  const createBody = {
    code: sampleCode,
    name: sampleName,
    type: sampleType,
    configuration: {
      options: sampleConfigOptions,
      required: sampleConfigRequired,
    },
  } satisfies IShoppingMallSkuAttribute.ICreate;

  const createdSkuAttr: IShoppingMallSkuAttribute =
    await api.functional.shoppingMall.customer.shoppingMallSkuAttributes.create(
      connection,
      {
        body: createBody,
      },
    );
  typia.assert(createdSkuAttr);

  TestValidator.equals(
    "created SKU attribute code matches input",
    createdSkuAttr.code,
    sampleCode,
  );
  TestValidator.equals(
    "created SKU attribute name matches input",
    createdSkuAttr.name,
    sampleName,
  );
  TestValidator.equals(
    "created SKU attribute type matches input",
    createdSkuAttr.type,
    sampleType,
  );
  TestValidator.equals(
    "created SKU attribute config options matches input",
    createdSkuAttr.configuration.options,
    sampleConfigOptions,
  );
  TestValidator.equals(
    "created SKU attribute config required matches input",
    createdSkuAttr.configuration.required,
    sampleConfigRequired,
  );

  // 3. Retrieve the SKU attribute by code and validate
  const retrievedSkuAttr: IShoppingMallSkuAttribute =
    await api.functional.shoppingMall.shoppingMallSkuAttributes.at(connection, {
      code: sampleCode,
    });
  typia.assert(retrievedSkuAttr);

  TestValidator.equals(
    "retrieved SKU attribute id matches created",
    retrievedSkuAttr.id,
    createdSkuAttr.id,
  );
  TestValidator.equals(
    "retrieved SKU attribute code matches created",
    retrievedSkuAttr.code,
    createdSkuAttr.code,
  );
  TestValidator.equals(
    "retrieved SKU attribute name matches created",
    retrievedSkuAttr.name,
    createdSkuAttr.name,
  );
  TestValidator.equals(
    "retrieved SKU attribute type matches created",
    retrievedSkuAttr.type,
    createdSkuAttr.type,
  );
  TestValidator.equals(
    "retrieved SKU attribute configuration options matches created",
    retrievedSkuAttr.configuration.options,
    createdSkuAttr.configuration.options,
  );
  TestValidator.equals(
    "retrieved SKU attribute configuration required flag matches created",
    retrievedSkuAttr.configuration.required,
    createdSkuAttr.configuration.required,
  );
  TestValidator.equals(
    "retrieved SKU attribute created_at matches created",
    retrievedSkuAttr.created_at,
    createdSkuAttr.created_at,
  );
  TestValidator.equals(
    "retrieved SKU attribute updated_at matches created",
    retrievedSkuAttr.updated_at,
    createdSkuAttr.updated_at,
  );
}
