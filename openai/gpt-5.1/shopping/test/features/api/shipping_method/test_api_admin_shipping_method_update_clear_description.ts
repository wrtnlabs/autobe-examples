import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallShippingMethod } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShippingMethod";

export async function test_api_admin_shipping_method_update_clear_description(
  connection: api.IConnection,
) {
  // 1. Register an admin to obtain authenticated context and tokens
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    ip: typia.random<string & tags.Format<"ipv4">>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 2. Create a shipping method with a non-null service_level_description
  const methodCode: string = RandomGenerator.alphaNumeric(12);
  const displayName: string = RandomGenerator.name();
  const initialDescription: string = RandomGenerator.paragraph({
    sentences: 5,
    wordMin: 3,
    wordMax: 8,
  });

  const createBody = {
    method_code: methodCode,
    display_name: displayName,
    service_level_description: initialDescription,
  } satisfies IShoppingMallShippingMethod.ICreate;

  const created: IShoppingMallShippingMethod =
    await api.functional.shoppingMall.admin.shippingMethods.create(connection, {
      body: createBody,
    });
  typia.assert(created);

  // Validate created shipping method basic invariants
  TestValidator.equals(
    "created method_code should match input methodCode",
    created.method_code,
    methodCode,
  );
  TestValidator.equals(
    "created display_name should match input displayName",
    created.display_name,
    displayName,
  );
  TestValidator.equals(
    "created service_level_description should match initialDescription",
    created.service_level_description,
    initialDescription,
  );

  // 3. Update the shipping method, clearing service_level_description by sending null
  const updateBody = {
    service_level_description: null,
  } satisfies IShoppingMallShippingMethod.IUpdate;

  const updated: IShoppingMallShippingMethod =
    await api.functional.shoppingMall.admin.shippingMethods.update(connection, {
      methodCode: methodCode,
      body: updateBody,
    });
  typia.assert(updated);

  // 4. Assert fields after update: method_code and display_name unchanged, description cleared
  TestValidator.equals(
    "updated method_code should remain unchanged",
    updated.method_code,
    created.method_code,
  );
  TestValidator.equals(
    "updated display_name should remain unchanged when omitted from update DTO",
    updated.display_name,
    created.display_name,
  );
  TestValidator.equals(
    "updated service_level_description should be null after explicit null update",
    updated.service_level_description,
    null,
  );

  // 5. Fetch shipping method via public GET and verify persisted state
  const fetched: IShoppingMallShippingMethod =
    await api.functional.shoppingMall.shippingMethods.at(connection, {
      methodCode: methodCode,
    });
  typia.assert(fetched);

  TestValidator.equals(
    "fetched method_code should match created method_code",
    fetched.method_code,
    created.method_code,
  );
  TestValidator.equals(
    "fetched display_name should match created display_name",
    fetched.display_name,
    created.display_name,
  );
  TestValidator.equals(
    "fetched service_level_description should be null after update",
    fetched.service_level_description,
    null,
  );
}
