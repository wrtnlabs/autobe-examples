import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallCountry } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCountry";

export async function test_api_country_retrieval_ignores_soft_deleted_records(
  connection: api.IConnection,
) {
  // 1. Admin joins to obtain authorized session for admin-only endpoints
  const adminJoinBody = {
    email: `${RandomGenerator.alphabets(8)}@example.com`,
    password: RandomGenerator.alphabets(12) as string & tags.Format<"password">,
    href: "https://admin.example.com/join" as string & tags.Format<"uri">,
    referrer: "https://admin.example.com/landing" as string &
      tags.Format<"uri">,
    ip: "192.168.0.1" as string & tags.Format<"ipv4">,
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminAuthorized);

  // 2. Admin creates a new country with a specific country_code
  const countryCode: string = RandomGenerator.alphabets(2).toUpperCase();

  const createCountryBody = {
    country_code: countryCode,
    name_en: RandomGenerator.name(2),
    phone_code: "+82",
    is_active: true,
    sort_order: 1 as number & tags.Type<"int32">,
  } satisfies IShoppingMallCountry.ICreate;

  const createdCountry: IShoppingMallCountry =
    await api.functional.shoppingMall.admin.countries.create(connection, {
      body: createCountryBody,
    });
  typia.assert<IShoppingMallCountry>(createdCountry);

  // Validate created country fields
  TestValidator.equals(
    "created country_code should match request body",
    createdCountry.country_code,
    countryCode,
  );
  TestValidator.predicate(
    "created country should be active",
    createdCountry.is_active === true,
  );

  // 3. Public retrieval should succeed before deletion
  const publicRetrievedBeforeDelete: IShoppingMallCountry =
    await api.functional.shoppingMall.countries.at(connection, {
      countryCode,
    });
  typia.assert<IShoppingMallCountry>(publicRetrievedBeforeDelete);

  TestValidator.equals(
    "public retrieval before delete should return same country_code",
    publicRetrievedBeforeDelete.country_code,
    countryCode,
  );

  // 4. Admin hard-deletes the country by its business countryCode
  await api.functional.shoppingMall.admin.countries.erase(connection, {
    countryCode,
  });

  // 5. After deletion, public retrieval must fail with an HTTP error
  await TestValidator.error(
    "public retrieval after delete should fail with HTTP error",
    async () => {
      await api.functional.shoppingMall.countries.at(connection, {
        countryCode,
      });
    },
  );

  // 6. Repeated retrieval attempts must continue to fail and not recreate data
  await TestValidator.error(
    "public retrieval after delete remains failing on second attempt",
    async () => {
      await api.functional.shoppingMall.countries.at(connection, {
        countryCode,
      });
    },
  );
}
