import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallCountry } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCountry";

export async function test_api_country_creation_allows_inactive_countries_for_staged_rollout(
  connection: api.IConnection,
) {
  // 1. Register an admin to obtain an authenticated admin context
  const adminJoinBody = {
    email: `inactive-country-admin+${RandomGenerator.alphaNumeric(8)}@example.com`,
    password: "P@ssw0rd!", // format<"password"> – value content is arbitrary
    href: "https://admin.example.com/onboarding",
    referrer: "https://admin.example.com/landing",
    // Omit ip so that backend may derive it; ip is optional (string|ipv4|ipv6|null|undefined)
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminAuthorized);

  // 2. Prepare a unique inactive country creation payload
  const uniqueSuffix = RandomGenerator.alphaNumeric(6).toUpperCase();
  const countryCode = `XX-${uniqueSuffix}`; // country_code: string (business-unique, but format is free-form string)

  const createCountryBody = {
    country_code: countryCode,
    name_en: `Inactive Country ${uniqueSuffix}`,
    phone_code: "+999",
    is_active: false,
    sort_order: 100,
  } satisfies IShoppingMallCountry.ICreate;

  const createdCountry: IShoppingMallCountry =
    await api.functional.shoppingMall.admin.countries.create(connection, {
      body: createCountryBody,
    });
  typia.assert<IShoppingMallCountry>(createdCountry);

  // 3. Business assertions: created as inactive, not deleted, and fields echoed correctly
  TestValidator.equals(
    "created country should be inactive for staged rollout",
    createdCountry.is_active,
    false,
  );

  TestValidator.equals(
    "deleted_at should be null or undefined on newly created country",
    createdCountry.deleted_at ?? null,
    null,
  );

  TestValidator.equals(
    "country_code should match the requested payload",
    createdCountry.country_code,
    createCountryBody.country_code,
  );

  TestValidator.equals(
    "name_en should match the requested payload",
    createdCountry.name_en,
    createCountryBody.name_en,
  );

  TestValidator.equals(
    "phone_code should match the requested payload (including nullability)",
    createdCountry.phone_code ?? null,
    createCountryBody.phone_code ?? null,
  );

  TestValidator.equals(
    "sort_order should match the requested payload",
    createdCountry.sort_order,
    createCountryBody.sort_order,
  );

  // Sanity-check: response id is a UUID string
  typia.assert<string & tags.Format<"uuid">>(createdCountry.id);
}
