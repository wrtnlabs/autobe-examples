import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCustomerAddress";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallAdminLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminLogin";
import type { IShoppingMallCountry } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCountry";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerAddress";
import type { IShoppingMallCustomerJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerJoin";
import type { IShoppingMallCustomerLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerLogin";
import type { IShoppingMallRegion } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRegion";

export async function test_api_customer_address_list_filter_by_country_and_region(
  connection: api.IConnection,
) {
  // 1. Admin join and login to be able to create countries and regions
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16) as string &
      tags.Format<"password">,
    ip: null,
    href: "https://admin.example.com/join" as string & tags.Format<"uri">,
    referrer: "https://admin.example.com" as string & tags.Format<"uri">,
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminJoin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminJoin);

  // 2. Create two countries as admin
  const countryAInput = {
    country_code: `CTY-${RandomGenerator.alphaNumeric(6)}`,
    name_en: RandomGenerator.name(2),
    phone_code: "+1",
    is_active: true,
    sort_order: 1 as number & tags.Type<"int32">,
  } satisfies IShoppingMallCountry.ICreate;

  const countryBInput = {
    country_code: `CTY-${RandomGenerator.alphaNumeric(6)}`,
    name_en: RandomGenerator.name(2),
    phone_code: "+82",
    is_active: true,
    sort_order: 2 as number & tags.Type<"int32">,
  } satisfies IShoppingMallCountry.ICreate;

  const countryA: IShoppingMallCountry =
    await api.functional.shoppingMall.admin.countries.create(connection, {
      body: countryAInput,
    });
  typia.assert(countryA);

  const countryB: IShoppingMallCountry =
    await api.functional.shoppingMall.admin.countries.create(connection, {
      body: countryBInput,
    });
  typia.assert(countryB);

  // 3. Create one region per country
  const regionABody = {
    code: `R-${RandomGenerator.alphaNumeric(4)}`,
    name_en: RandomGenerator.name(2),
    region_type: "state",
    is_active: true,
    sort_order: 1 as number & tags.Type<"int32">,
  } satisfies IShoppingMallRegion.ICreate;

  const regionBBody = {
    code: `R-${RandomGenerator.alphaNumeric(4)}`,
    name_en: RandomGenerator.name(2),
    region_type: "state",
    is_active: true,
    sort_order: 1 as number & tags.Type<"int32">,
  } satisfies IShoppingMallRegion.ICreate;

  const regionA: IShoppingMallRegion =
    await api.functional.shoppingMall.admin.countries.regions.create(
      connection,
      {
        countryCode: countryA.country_code,
        body: regionABody,
      },
    );
  typia.assert(regionA);

  const regionB: IShoppingMallRegion =
    await api.functional.shoppingMall.admin.countries.regions.create(
      connection,
      {
        countryCode: countryB.country_code,
        body: regionBBody,
      },
    );
  typia.assert(regionB);

  // 4. Register a customer (this also authenticates as that customer)
  const customerJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16) as string &
      tags.Format<"password">,
    ip: null,
    href: "https://shop.example.com/join" as string & tags.Format<"uri">,
    referrer: "https://shop.example.com" as string & tags.Format<"uri">,
  } satisfies IShoppingMallCustomerJoin.IRequest;

  const customerAuth: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerJoinBody,
    });
  typia.assert(customerAuth);

  const customerId = customerAuth.id;

  // 5. As this customer, create multiple addresses for each country/region
  const createAddressFor = async (
    country: IShoppingMallCountry,
    region: IShoppingMallRegion,
    count: number,
  ): Promise<IShoppingMallCustomerAddress[]> => {
    return await ArrayUtil.asyncRepeat(count, async (index) => {
      const body = {
        shopping_mall_country_id: country.id,
        shopping_mall_region_id: region.id,
        recipient_name: RandomGenerator.name(2),
        line1: `${RandomGenerator.alphabets(8)} Street ${index + 1}`,
        line2: index % 2 === 0 ? null : `Suite ${index + 100}`,
        city: RandomGenerator.name(1),
        postal_code: RandomGenerator.alphaNumeric(6),
        phone_number: RandomGenerator.mobile(),
        is_default: index === 0,
      } satisfies IShoppingMallCustomerAddress.ICreate;

      const address: IShoppingMallCustomerAddress =
        await api.functional.shoppingMall.customer.customers.addresses.create(
          connection,
          {
            customerId,
            body,
          },
        );
      typia.assert(address);
      return address;
    });
  };

  const addressesCountryA = await createAddressFor(countryA, regionA, 3);
  const addressesCountryB = await createAddressFor(countryB, regionB, 2);

  TestValidator.predicate(
    "created addresses for both countries",
    addressesCountryA.length === 3 && addressesCountryB.length === 2,
  );

  // 6. Call index with filter for COUNTRY_A + regionA
  const requestA = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    pageSize: 20 as number & tags.Type<"int32"> & tags.Minimum<1>,
    sortKey: "created_at",
    sortDirection: "desc",
    countryId: countryA.id,
    regionId: regionA.id,
    q: undefined,
  } satisfies IShoppingMallCustomerAddress.IRequest;

  const pageA: IPageIShoppingMallCustomerAddress.ISummary =
    await api.functional.shoppingMall.customer.customers.addresses.index(
      connection,
      {
        customerId,
        body: requestA,
      },
    );
  typia.assert(pageA);

  // 7. Validate all addresses belong to COUNTRY_A, regionA and none from COUNTRY_B
  TestValidator.predicate(
    "pageA has at least one record",
    pageA.pagination.records >= 1,
  );

  for (const summary of pageA.data) {
    TestValidator.equals(
      "all results must be in country A",
      summary.country.id,
      countryA.id,
    );

    if (summary.region !== null && summary.region !== undefined) {
      TestValidator.equals(
        "region must match region A when not null",
        summary.region.id,
        regionA.id,
      );
    }

    TestValidator.notEquals(
      "no address should belong to country B",
      summary.country.id,
      countryB.id,
    );
  }

  // 8. Optionally, verify filtering for COUNTRY_B as well
  const requestB = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    pageSize: 20 as number & tags.Type<"int32"> & tags.Minimum<1>,
    sortKey: "created_at",
    sortDirection: "desc",
    countryId: countryB.id,
    regionId: regionB.id,
    q: undefined,
  } satisfies IShoppingMallCustomerAddress.IRequest;

  const pageB: IPageIShoppingMallCustomerAddress.ISummary =
    await api.functional.shoppingMall.customer.customers.addresses.index(
      connection,
      {
        customerId,
        body: requestB,
      },
    );
  typia.assert(pageB);

  for (const summary of pageB.data) {
    TestValidator.equals(
      "all results must be in country B",
      summary.country.id,
      countryB.id,
    );

    if (summary.region !== null && summary.region !== undefined) {
      TestValidator.equals(
        "region must match region B when not null",
        summary.region.id,
        regionB.id,
      );
    }

    TestValidator.notEquals(
      "no address should belong to country A in B filter",
      summary.country.id,
      countryA.id,
    );
  }
}
