import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallCountry } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCountry";

/**
 * Ensure that country master creation is allowed only for authenticated admins,
 * and that unauthenticated callers cannot access the admin-only endpoint.
 *
 * Business context: Country master data (IShoppingMallCountry) controls which
 * countries can be used across the shoppingMall platform (addresses, shipping,
 * configuration). The POST /shoppingMall/admin/countries endpoint is restricted
 * to admin actors, and authorization is driven by JWT tokens managed
 * automatically by the SDK.
 *
 * Scenario steps:
 *
 * 1. Register an admin via POST /auth/admin/join to obtain an authenticated admin
 *    session.
 * 2. With the authenticated admin connection, create a new country via POST
 *    /shoppingMall/admin/countries and validate that:
 *
 *    - The response conforms to IShoppingMallCountry
 *    - Core business fields echo the request payload (country_code, name_en,
 *         phone_code, is_active, sort_order)
 * 3. Create an unauthenticated connection (no Authorization header) and attempt to
 *    call POST /shoppingMall/admin/countries with a valid payload. Assert that
 *    this call fails using TestValidator.error, proving that authentication is
 *    required.
 *
 * The original natural-language scenario also mentioned testing with a
 * non-admin token. However, the available SDK functions only provide admin
 * join/login flows and no customer/seller authentication endpoints. Following
 * the mandatory scenario rewrite rules, this test focuses on the implementable
 * parts only: authenticated admin vs unauthenticated caller.
 */
export async function test_api_country_creation_requires_admin_authentication(
  connection: api.IConnection,
) {
  // Step 1: Admin join to obtain an authenticated admin context
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
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminAuthorized);

  // Step 2: Authenticated admin creates a country
  const createCountryBody = {
    country_code: RandomGenerator.alphabets(2).toUpperCase(),
    name_en: RandomGenerator.paragraph({ sentences: 2 }),
    phone_code: "+" + RandomGenerator.alphaNumeric(2),
    is_active: true,
    sort_order: typia.random<number & tags.Type<"int32">>(),
  } satisfies IShoppingMallCountry.ICreate;

  const createdCountry: IShoppingMallCountry =
    await api.functional.shoppingMall.admin.countries.create(connection, {
      body: createCountryBody,
    });
  typia.assert<IShoppingMallCountry>(createdCountry);

  // Validate that the created country echoes the request payload
  TestValidator.equals(
    "country_code should match request payload",
    createdCountry.country_code,
    createCountryBody.country_code,
  );
  TestValidator.equals(
    "name_en should match request payload",
    createdCountry.name_en,
    createCountryBody.name_en,
  );
  TestValidator.equals(
    "phone_code should match request payload (including nullability)",
    createdCountry.phone_code ?? null,
    createCountryBody.phone_code ?? null,
  );
  TestValidator.equals(
    "is_active should match request payload",
    createdCountry.is_active,
    createCountryBody.is_active,
  );
  TestValidator.equals(
    "sort_order should match request payload",
    createdCountry.sort_order,
    createCountryBody.sort_order,
  );

  // Step 3: Unauthenticated connection must not be able to create a country
  const unauthenticatedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  await TestValidator.error(
    "unauthenticated caller cannot create country",
    async () => {
      await api.functional.shoppingMall.admin.countries.create(
        unauthenticatedConnection,
        {
          body: createCountryBody,
        },
      );
    },
  );
}
