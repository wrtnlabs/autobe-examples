import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallCountry } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCountry";

export async function test_api_country_retrieval_not_found_for_unknown_code(
  connection: api.IConnection,
) {
  // 1. Admin bootstrap via POST /auth/admin/join
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized = await api.functional.auth.admin.join(connection, {
    body: adminJoinBody,
  });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminAuthorized);

  // 2. Seed at least one real country via POST /shoppingMall/admin/countries
  const seedCountryBody = {
    country_code: "ZZ_SEED",
    name_en: RandomGenerator.paragraph({ sentences: 2 }),
    phone_code: "+999",
    is_active: true,
    sort_order: 1 as number & tags.Type<"int32">,
  } satisfies IShoppingMallCountry.ICreate;

  const seedCountry = await api.functional.shoppingMall.admin.countries.create(
    connection,
    {
      body: seedCountryBody,
    },
  );
  typia.assert<IShoppingMallCountry>(seedCountry);

  // 3. Define a guaranteed-unknown country code different from seeded one
  const unknownCountryCode = "XX-NONEXISTENT-TEST";

  // 4. First call: unknown code should produce 404 Not Found
  await TestValidator.httpError(
    "unknown country code should result in 404 not found",
    404,
    async () => {
      await api.functional.shoppingMall.countries.at(connection, {
        countryCode: unknownCountryCode,
      });
    },
  );

  // 5. Second call: repeated use of the same unknown code should also produce 404
  await TestValidator.httpError(
    "repeated unknown country code should still result in 404 not found",
    404,
    async () => {
      await api.functional.shoppingMall.countries.at(connection, {
        countryCode: unknownCountryCode,
      });
    },
  );
}
