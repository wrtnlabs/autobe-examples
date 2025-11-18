import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallCountry } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCountry";

/**
 * Validate that hard-deleting a country via admin endpoint requires admin auth
 * and cannot be done anonymously.
 *
 * Business flow:
 *
 * 1. Register an admin (POST /auth/admin/join) and rely on SDK to set
 *    Authorization.
 * 2. As that admin, create a country (POST /shoppingMall/admin/countries).
 * 3. With an anonymous connection (no headers), attempt DELETE on the same country
 *    and assert that it fails.
 * 4. With the original admin-auth connection, perform DELETE again and assert that
 *    it succeeds.
 */
export async function test_api_admin_country_hard_delete_requires_admin_auth(
  connection: api.IConnection,
) {
  // 1. Admin join to obtain admin-authenticated connection
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    ip: null,
    href: "https://admin.test.local/join",
    referrer: "https://admin.test.local/",
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuth: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: joinBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminAuth);

  // 2. Create a country as admin
  const countryCode = `T-${RandomGenerator.alphaNumeric(8)}`;
  const createBody = {
    country_code: countryCode,
    name_en: RandomGenerator.paragraph({ sentences: 2 }),
    phone_code: "+999",
    is_active: true,
    sort_order: 1,
  } satisfies IShoppingMallCountry.ICreate;

  const created: IShoppingMallCountry =
    await api.functional.shoppingMall.admin.countries.create(connection, {
      body: createBody,
    });
  typia.assert<IShoppingMallCountry>(created);
  TestValidator.equals(
    "created country_code should match input",
    created.country_code,
    countryCode,
  );

  // 3. Anonymous connection should not be able to hard-delete
  const anonymousConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  await TestValidator.error("anonymous delete must fail", async () => {
    await api.functional.shoppingMall.admin.countries.erase(
      anonymousConnection,
      { countryCode },
    );
  });

  // 4. Admin-authenticated delete should succeed
  await api.functional.shoppingMall.admin.countries.erase(connection, {
    countryCode,
  });
}
