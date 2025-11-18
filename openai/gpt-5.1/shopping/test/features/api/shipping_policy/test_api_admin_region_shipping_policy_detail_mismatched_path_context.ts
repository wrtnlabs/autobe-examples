import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallCountry } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCountry";
import type { IShoppingMallRegion } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRegion";
import type { IShoppingMallRegionShippingPolicy } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRegionShippingPolicy";

export async function test_api_admin_region_shipping_policy_detail_mismatched_path_context(
  connection: api.IConnection,
) {
  // 1. Register an admin and obtain authenticated context
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminAuthorized);

  // 2. Create two countries: US and CA
  const countryUSBody = {
    country_code: "US",
    name_en: "United States",
    phone_code: "+1",
    is_active: true,
    sort_order: 1 as number & tags.Type<"int32">,
  } satisfies IShoppingMallCountry.ICreate;

  const countryUS: IShoppingMallCountry =
    await api.functional.shoppingMall.admin.countries.create(connection, {
      body: countryUSBody,
    });
  typia.assert<IShoppingMallCountry>(countryUS);

  const countryCABody = {
    country_code: "CA",
    name_en: "Canada",
    phone_code: "+1",
    is_active: true,
    sort_order: 2 as number & tags.Type<"int32">,
  } satisfies IShoppingMallCountry.ICreate;

  const countryCA: IShoppingMallCountry =
    await api.functional.shoppingMall.admin.countries.create(connection, {
      body: countryCABody,
    });
  typia.assert<IShoppingMallCountry>(countryCA);

  // 3. Create one region under each country: NY under US, ON under CA
  const regionUSNYBody = {
    code: "NY",
    name_en: "New York",
    region_type: "state",
    is_active: true,
    sort_order: 1 as number & tags.Type<"int32">,
  } satisfies IShoppingMallRegion.ICreate;

  const regionUSNY: IShoppingMallRegion =
    await api.functional.shoppingMall.admin.countries.regions.create(
      connection,
      {
        countryCode: countryUS.country_code,
        body: regionUSNYBody,
      },
    );
  typia.assert<IShoppingMallRegion>(regionUSNY);

  const regionCAONBody = {
    code: "ON",
    name_en: "Ontario",
    region_type: "province",
    is_active: true,
    sort_order: 1 as number & tags.Type<"int32">,
  } satisfies IShoppingMallRegion.ICreate;

  const regionCAON: IShoppingMallRegion =
    await api.functional.shoppingMall.admin.countries.regions.create(
      connection,
      {
        countryCode: countryCA.country_code,
        body: regionCAONBody,
      },
    );
  typia.assert<IShoppingMallRegion>(regionCAON);

  // 4. Create one region shipping policy per region
  const policyUSNYBody = {
    policy_name: "US-NY Standard Shipping",
    shipping_method_group: "STD",
    min_order_amount: 0,
    max_order_amount: null,
    allows_cod: true,
    is_shipping_allowed: true,
    notes: RandomGenerator.paragraph({ sentences: 3 }),
    effective_from: null,
    effective_until: null,
  } satisfies IShoppingMallRegionShippingPolicy.ICreate;

  const policyUSNY: IShoppingMallRegionShippingPolicy =
    await api.functional.shoppingMall.countries.regions.shippingPolicies.create(
      connection,
      {
        countryCode: countryUS.country_code,
        regionCode: regionUSNY.code,
        body: policyUSNYBody,
      },
    );
  typia.assert<IShoppingMallRegionShippingPolicy>(policyUSNY);

  const policyCAONBody = {
    policy_name: "CA-ON Standard Shipping",
    shipping_method_group: "STD",
    min_order_amount: 0,
    max_order_amount: null,
    allows_cod: false,
    is_shipping_allowed: true,
    notes: RandomGenerator.paragraph({ sentences: 3 }),
    effective_from: null,
    effective_until: null,
  } satisfies IShoppingMallRegionShippingPolicy.ICreate;

  const policyCAON: IShoppingMallRegionShippingPolicy =
    await api.functional.shoppingMall.countries.regions.shippingPolicies.create(
      connection,
      {
        countryCode: countryCA.country_code,
        regionCode: regionCAON.code,
        body: policyCAONBody,
      },
    );
  typia.assert<IShoppingMallRegionShippingPolicy>(policyCAON);

  // 5. Happy-path: correct triplet (US, NY, policyUSNY.id)
  const detailUSNY: IShoppingMallRegionShippingPolicy =
    await api.functional.shoppingMall.countries.regions.shippingPolicies.at(
      connection,
      {
        countryCode: countryUS.country_code,
        regionCode: regionUSNY.code,
        policyId: policyUSNY.id,
      },
    );
  typia.assert<IShoppingMallRegionShippingPolicy>(detailUSNY);

  TestValidator.equals(
    "happy-path: policy id should match",
    detailUSNY.id,
    policyUSNY.id,
  );

  TestValidator.equals(
    "happy-path: region code should match NY",
    detailUSNY.region.code,
    regionUSNY.code,
  );

  TestValidator.equals(
    "happy-path: country code on region should match US",
    detailUSNY.region.country.country_code,
    countryUS.country_code,
  );

  // 6. Mismatched path: (CA, ON, policyUSNY.id) should fail
  await TestValidator.error(
    "mismatched country/region for policyUSNY",
    async () => {
      await api.functional.shoppingMall.countries.regions.shippingPolicies.at(
        connection,
        {
          countryCode: countryCA.country_code,
          regionCode: regionCAON.code,
          policyId: policyUSNY.id,
        },
      );
    },
  );

  // 7. Mismatched path: (US, NY, policyCAON.id) should fail
  await TestValidator.error(
    "mismatched policy id in US/NY context",
    async () => {
      await api.functional.shoppingMall.countries.regions.shippingPolicies.at(
        connection,
        {
          countryCode: countryUS.country_code,
          regionCode: regionUSNY.code,
          policyId: policyCAON.id,
        },
      );
    },
  );
}
