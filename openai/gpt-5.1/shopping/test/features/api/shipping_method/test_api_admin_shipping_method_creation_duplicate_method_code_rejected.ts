import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallShippingMethod } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShippingMethod";

/**
 * Ensure admin shipping method creation enforces unique method_code and that
 * duplicate creation attempts are rejected without modifying existing
 * configuration.
 *
 * Business flow:
 *
 * 1. Register an admin via POST /auth/admin/join to obtain an authenticated admin
 *    context (Authorization header managed by SDK).
 * 2. Create an admin shipping method via POST /shoppingMall/admin/shippingMethods
 *    with a concrete method_code, display_name, and optional
 *    service_level_description.
 * 3. Attempt to create another shipping method with the same method_code but
 *    different human‑readable fields and assert that the call fails.
 * 4. Read the shipping method back via GET
 *    /shoppingMall/shippingMethods/{methodCode} and assert that the
 *    configuration still matches the first successful creation, proving the
 *    duplicate attempt did not overwrite it.
 */
export async function test_api_admin_shipping_method_creation_duplicate_method_code_rejected(
  connection: api.IConnection,
) {
  // 1. Admin joins to obtain authorized context
  const adminJoinBody = {
    email: `admin+${RandomGenerator.alphaNumeric(8)}@example.com`,
    password: "AdminPassw0rd!", // satisfies tags.Format<"password">
    href: "https://admin.example.com/join", // uri
    referrer: "https://admin.example.com/landing", // uri
    // ip is optional; omit for simplicity
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 2. Create first shipping method
  const methodCode = `overnight-${RandomGenerator.alphaNumeric(6)}`;
  const firstCreateBody = {
    method_code: methodCode,
    display_name: "Overnight Delivery",
    service_level_description: RandomGenerator.paragraph({
      sentences: 5,
      wordMin: 3,
      wordMax: 8,
    }),
  } satisfies IShoppingMallShippingMethod.ICreate;

  const firstCreated: IShoppingMallShippingMethod =
    await api.functional.shoppingMall.admin.shippingMethods.create(connection, {
      body: firstCreateBody,
    });
  typia.assert(firstCreated);

  // Sanity: method_code and basic fields match
  TestValidator.equals(
    "first created shipping method has requested method_code",
    firstCreated.method_code,
    firstCreateBody.method_code,
  );
  TestValidator.equals(
    "first created shipping method has requested display_name",
    firstCreated.display_name,
    firstCreateBody.display_name,
  );

  // 3. Attempt duplicate create with same method_code but different fields
  const secondCreateBody = {
    method_code: methodCode, // duplicate code
    display_name: "Overnight Express", // changed name
    service_level_description: RandomGenerator.paragraph({
      sentences: 3,
      wordMin: 4,
      wordMax: 9,
    }),
  } satisfies IShoppingMallShippingMethod.ICreate;

  await TestValidator.error(
    "duplicate method_code shipping method creation must fail",
    async () => {
      await api.functional.shoppingMall.admin.shippingMethods.create(
        connection,
        {
          body: secondCreateBody,
        },
      );
    },
  );

  // 4. Read back by methodCode and verify original config is intact
  const fetched: IShoppingMallShippingMethod =
    await api.functional.shoppingMall.shippingMethods.at(connection, {
      methodCode,
    });
  typia.assert(fetched);

  TestValidator.equals(
    "fetched shipping method retains original method_code",
    fetched.method_code,
    firstCreateBody.method_code,
  );
  TestValidator.equals(
    "duplicate create did not overwrite display_name",
    fetched.display_name,
    firstCreateBody.display_name,
  );
  TestValidator.equals(
    "duplicate create did not overwrite service_level_description",
    fetched.service_level_description,
    firstCreateBody.service_level_description,
  );
}
