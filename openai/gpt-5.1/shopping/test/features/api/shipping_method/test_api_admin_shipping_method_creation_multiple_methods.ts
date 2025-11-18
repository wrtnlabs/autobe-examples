import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallShippingMethod } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShippingMethod";

/**
 * Validate creation of multiple independent shipping methods by an admin and
 * their retrieval via public GET by method_code.
 *
 * Business goals:
 *
 * - An administrator can register multiple shipping methods side by side.
 * - Each shipping method has a stable business identifier `method_code` that is
 *   unique.
 * - Public read API exposes each configuration independently without
 *   cross-contamination.
 *
 * Scenario steps:
 *
 * 1. Register an admin with POST /auth/admin/join to establish admin
 *    authorization.
 * 2. As that admin, create three shipping methods via POST
 *    /shoppingMall/admin/shippingMethods using distinct method_code values:
 *    "standard", "express", "economy".
 * 3. Assert that each creation response is a valid IShoppingMallShippingMethod and
 *    that ids and method_code values are all unique.
 * 4. For each created method, call GET /shoppingMall/shippingMethods/{methodCode}
 *    and validate that the retrieved record matches the created configuration
 *    for that code (id, method_code, display_name, service_level_description).
 */
export async function test_api_admin_shipping_method_creation_multiple_methods(
  connection: api.IConnection,
) {
  // 1. Admin join - establish admin context and Authorization header.
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 2. Prepare three distinct shipping method creation payloads.
  const standardBody = {
    method_code: "standard",
    display_name: "Standard Shipping",
    service_level_description: "Delivers in 3-5 business days",
  } satisfies IShoppingMallShippingMethod.ICreate;

  const expressBody = {
    method_code: "express",
    display_name: "Express Shipping",
    service_level_description: "Delivers in 1-2 business days",
  } satisfies IShoppingMallShippingMethod.ICreate;

  const economyBody = {
    method_code: "economy",
    display_name: "Economy Shipping",
    service_level_description: null,
  } satisfies IShoppingMallShippingMethod.ICreate;

  const createBodies: IShoppingMallShippingMethod.ICreate[] = [
    standardBody,
    expressBody,
    economyBody,
  ];

  // 3. Create shipping methods and collect results.
  const createdMethods: IShoppingMallShippingMethod[] = [];
  for (const body of createBodies) {
    const created: IShoppingMallShippingMethod =
      await api.functional.shoppingMall.admin.shippingMethods.create(
        connection,
        { body },
      );
    typia.assert(created);
    createdMethods.push(created);
  }

  // 4. Assert uniqueness of ids and method_code values.
  const ids = createdMethods.map((m) => m.id);
  const codes = createdMethods.map((m) => m.method_code);

  TestValidator.equals(
    "three shipping method ids returned",
    createdMethods.length,
    3,
  );
  TestValidator.equals(
    "three distinct method codes returned",
    new Set(codes).size,
    3,
  );
  TestValidator.equals("three distinct ids returned", new Set(ids).size, 3);

  // Map from method_code to created entity for later comparison.
  const createdByCode: Record<string, IShoppingMallShippingMethod> = {};
  for (const method of createdMethods) {
    createdByCode[method.method_code] = method;
  }

  // 5. For each created method_code, GET and validate fields.
  for (const body of createBodies) {
    const methodCode = body.method_code;
    const created = createdByCode[methodCode];

    const fetched: IShoppingMallShippingMethod =
      await api.functional.shoppingMall.shippingMethods.at(connection, {
        methodCode,
      });
    typia.assert(fetched);

    TestValidator.equals(
      `fetched id matches created for ${methodCode}`,
      fetched.id,
      created.id,
    );
    TestValidator.equals(
      `fetched method_code matches path for ${methodCode}`,
      fetched.method_code,
      methodCode,
    );
    TestValidator.equals(
      `fetched display_name matches created for ${methodCode}`,
      fetched.display_name,
      created.display_name,
    );
    TestValidator.equals(
      `fetched service_level_description matches created for ${methodCode}`,
      fetched.service_level_description ?? null,
      created.service_level_description ?? null,
    );
  }
}
