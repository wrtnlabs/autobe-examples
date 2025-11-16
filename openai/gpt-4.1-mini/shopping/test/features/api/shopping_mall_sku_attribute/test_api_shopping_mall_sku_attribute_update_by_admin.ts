import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallSkuAttribute } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSkuAttribute";
import type { IShoppingMallSkuAttributeConfigurations } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSkuAttributeConfigurations";

export async function test_api_shopping_mall_sku_attribute_update_by_admin(
  connection: api.IConnection,
) {
  // 1. Admin user registration and login
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminCreateBody = {
    email: adminEmail,
    name: RandomGenerator.name(),
    password: "Password123!",
    phone_number: null,
    role: "admin",
  } satisfies IShoppingMallAdmin.ICreate;

  const adminUser = await api.functional.auth.admin.join(connection, {
    body: adminCreateBody,
  });
  typia.assert(adminUser);

  const adminLoginBody = {
    email: adminEmail,
    password: "Password123!",
    ip: null,
    href: "https://example.com/admin/login",
    referrer: "https://example.com",
  } satisfies IShoppingMallAdmin.ILogin;

  await api.functional.auth.admin.login(connection, { body: adminLoginBody });

  // 2. Customer user registration and login
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customerCreateBody = {
    email: customerEmail,
    password: "Password123!",
    full_name: RandomGenerator.name(),
    ip: null,
    href: "https://example.com/customer/join",
    referrer: "https://example.com",
  } satisfies IShoppingMallCustomer.ICreate;

  const customerUser = await api.functional.auth.customer.join(connection, {
    body: customerCreateBody,
  });
  typia.assert(customerUser);

  const customerLoginBody = {
    email: customerEmail,
    password: "Password123!",
    ip: null,
    href: "https://example.com/customer/login",
    referrer: "https://example.com",
  } satisfies IShoppingMallCustomer.ILogin;

  await api.functional.auth.customer.login(connection, {
    body: customerLoginBody,
  });

  // 3. Customer creates a SKU attribute
  const initialSkuAttributeCode = RandomGenerator.alphaNumeric(10);
  const initialSkuAttributeConfiguration: IShoppingMallSkuAttributeConfigurations =
    {
      options: ["option1", "option2"],
      required: true,
    };

  const skuAttributeCreateBody = {
    code: initialSkuAttributeCode,
    name: "Color",
    type: "string",
    configuration: initialSkuAttributeConfiguration,
  } satisfies IShoppingMallSkuAttribute.ICreate;

  const createdSkuAttribute =
    await api.functional.shoppingMall.customer.shoppingMallSkuAttributes.create(
      connection,
      {
        body: skuAttributeCreateBody,
      },
    );
  typia.assert(createdSkuAttribute);

  // 4. Switch to admin context again to update the SKU attribute
  await api.functional.auth.admin.login(connection, { body: adminLoginBody });

  const updatedSkuAttributeConfiguration: IShoppingMallSkuAttributeConfigurations =
    {
      options: ["red", "blue", "green"],
      required: true,
    };

  const skuAttributeUpdateBody = {
    code: createdSkuAttribute.code,
    name: "Color",
    type: "string",
    configuration: updatedSkuAttributeConfiguration,
  } satisfies IShoppingMallSkuAttribute.ICreate;

  const updatedSkuAttribute =
    await api.functional.shoppingMall.admin.shoppingMallSkuAttributes.update(
      connection,
      {
        code: createdSkuAttribute.code,
        body: skuAttributeUpdateBody,
      },
    );
  typia.assert(updatedSkuAttribute);

  // 5. Verify that the update is reflected correctly
  TestValidator.equals(
    "SKU attribute code should remain the same",
    updatedSkuAttribute.code,
    createdSkuAttribute.code,
  );
  TestValidator.equals(
    "SKU attribute name should be updated",
    updatedSkuAttribute.name,
    skuAttributeUpdateBody.name,
  );
  TestValidator.equals(
    "SKU attribute type should be updated",
    updatedSkuAttribute.type,
    skuAttributeUpdateBody.type,
  );
  TestValidator.equals(
    "SKU attribute configuration options should be updated",
    updatedSkuAttribute.configuration.options,
    skuAttributeUpdateBody.configuration.options,
  );
  TestValidator.equals(
    "SKU attribute configuration required flag should be updated",
    updatedSkuAttribute.configuration.required,
    skuAttributeUpdateBody.configuration.required,
  );
}
