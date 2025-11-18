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

export async function test_api_customer_address_list_sorting_by_creation_date(
  connection: api.IConnection,
) {
  // 1. Admin join and login to be able to create country and region
  const adminJoinBody = {
    email: `${RandomGenerator.alphaNumeric(8)}@admin.test.com`,
    password: RandomGenerator.alphaNumeric(12) as string &
      tags.Format<"password">,
    ip: null,
    href: "https://admin.test.com/join" as string & tags.Format<"uri">,
    referrer: "https://admin.test.com" as string & tags.Format<"uri">,
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 2. Create a country as admin
  const countryCreateBody = {
    country_code: `CTY-${RandomGenerator.alphaNumeric(4)}`,
    name_en: "Test Country",
    phone_code: "+99",
    is_active: true,
    sort_order: 1 as number & tags.Type<"int32">,
  } satisfies IShoppingMallCountry.ICreate;

  const country: IShoppingMallCountry =
    await api.functional.shoppingMall.admin.countries.create(connection, {
      body: countryCreateBody,
    });
  typia.assert(country);

  // 3. Create a region under the country as admin
  const regionCreateBody = {
    code: `RG-${RandomGenerator.alphaNumeric(4)}`,
    name_en: "Test Region",
    region_type: "state",
    is_active: true,
    sort_order: 1 as number & tags.Type<"int32">,
  } satisfies IShoppingMallRegion.ICreate;

  const region: IShoppingMallRegion =
    await api.functional.shoppingMall.admin.countries.regions.create(
      connection,
      {
        countryCode: country.country_code,
        body: regionCreateBody,
      },
    );
  typia.assert(region);

  // 4. Customer join (also authenticates the customer)
  const customerJoinBody = {
    email: `${RandomGenerator.alphaNumeric(8)}@customer.test.com` as string &
      tags.Format<"email">,
    password: RandomGenerator.alphaNumeric(12) as string &
      tags.Format<"password">,
    ip: null,
    href: "https://customer.test.com/join" as string & tags.Format<"uri">,
    referrer: "https://customer.test.com" as string & tags.Format<"uri">,
  } satisfies IShoppingMallCustomerJoin.IRequest;

  const customerAuthorized: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerJoinBody,
    });
  typia.assert(customerAuthorized);

  const customerId: string & tags.Format<"uuid"> = customerAuthorized.id;

  // 5. Create three addresses sequentially as the authenticated customer
  const addressBodies: IShoppingMallCustomerAddress.ICreate[] = [
    {
      shopping_mall_country_id: country.id,
      shopping_mall_region_id: region.id,
      recipient_name: "Recipient A",
      line1: "123 Alpha Street",
      line2: "Apt 1",
      city: "Alpha City",
      postal_code: "11111",
      phone_number: RandomGenerator.mobile(),
      is_default: false,
    },
    {
      shopping_mall_country_id: country.id,
      shopping_mall_region_id: region.id,
      recipient_name: "Recipient B",
      line1: "456 Beta Avenue",
      line2: "Suite 2",
      city: "Beta City",
      postal_code: "22222",
      phone_number: RandomGenerator.mobile(),
      is_default: false,
    },
    {
      shopping_mall_country_id: country.id,
      shopping_mall_region_id: region.id,
      recipient_name: "Recipient C",
      line1: "789 Gamma Road",
      line2: "Floor 3",
      city: "Gamma City",
      postal_code: "33333",
      phone_number: RandomGenerator.mobile(),
      is_default: false,
    },
  ];

  const createdAddresses: IShoppingMallCustomerAddress[] = [];

  for (const body of addressBodies) {
    const created =
      await api.functional.shoppingMall.customer.customers.addresses.create(
        connection,
        {
          customerId,
          body,
        },
      );
    typia.assert(created);
    createdAddresses.push(created);
  }

  const [addressA, addressB, addressC] = createdAddresses;

  // 6. List addresses sorted by created_at ascending
  const ascRequestBody = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    pageSize: 10 as number & tags.Type<"int32"> & tags.Minimum<1>,
    sortKey: "created_at",
    sortDirection: "asc",
  } satisfies IShoppingMallCustomerAddress.IRequest;

  const ascPage: IPageIShoppingMallCustomerAddress.ISummary =
    await api.functional.shoppingMall.customer.customers.addresses.index(
      connection,
      {
        customerId,
        body: ascRequestBody,
      },
    );
  typia.assert(ascPage);

  // Validate pagination metadata for asc
  const ascPagination: IPage.IPagination = ascPage.pagination;
  typia.assert(ascPagination);

  TestValidator.equals(
    "asc pagination current page is 1",
    ascPagination.current,
    1 as number & tags.Type<"int32"> & tags.Minimum<0>,
  );

  TestValidator.equals(
    "asc pagination limit matches pageSize",
    ascPagination.limit,
    10 as number & tags.Type<"int32"> & tags.Minimum<0>,
  );

  TestValidator.equals(
    "asc pagination records equals 3",
    ascPagination.records,
    3 as number & tags.Type<"int32"> & tags.Minimum<0>,
  );

  TestValidator.equals(
    "asc pagination pages equals 1",
    ascPagination.pages,
    1 as number & tags.Type<"int32"> & tags.Minimum<0>,
  );

  TestValidator.equals("asc data length is 3", ascPage.data.length, 3);

  const ascIds = ascPage.data.map((summary) => summary.id);

  TestValidator.equals("ascending order should be A, B, C", ascIds, [
    addressA.id,
    addressB.id,
    addressC.id,
  ]);

  // 7. List addresses sorted by created_at descending
  const descRequestBody = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    pageSize: 10 as number & tags.Type<"int32"> & tags.Minimum<1>,
    sortKey: "created_at",
    sortDirection: "desc",
  } satisfies IShoppingMallCustomerAddress.IRequest;

  const descPage: IPageIShoppingMallCustomerAddress.ISummary =
    await api.functional.shoppingMall.customer.customers.addresses.index(
      connection,
      {
        customerId,
        body: descRequestBody,
      },
    );
  typia.assert(descPage);

  const descPagination: IPage.IPagination = descPage.pagination;
  typia.assert(descPagination);

  TestValidator.equals(
    "desc pagination current page is 1",
    descPagination.current,
    1 as number & tags.Type<"int32"> & tags.Minimum<0>,
  );

  TestValidator.equals(
    "desc pagination limit matches pageSize",
    descPagination.limit,
    10 as number & tags.Type<"int32"> & tags.Minimum<0>,
  );

  TestValidator.equals(
    "desc pagination records equals 3",
    descPagination.records,
    3 as number & tags.Type<"int32"> & tags.Minimum<0>,
  );

  TestValidator.equals(
    "desc pagination pages equals 1",
    descPagination.pages,
    1 as number & tags.Type<"int32"> & tags.Minimum<0>,
  );

  TestValidator.equals("desc data length is 3", descPage.data.length, 3);

  const descIds = descPage.data.map((summary) => summary.id);

  TestValidator.equals("descending order should be C, B, A", descIds, [
    addressC.id,
    addressB.id,
    addressA.id,
  ]);

  // 8. Ensure both asc and desc result sets reference the same set of IDs
  const ascSorted = [...ascIds].sort();
  const descSorted = [...descIds].sort();

  TestValidator.equals(
    "asc and desc contain same IDs regardless of order",
    ascSorted,
    descSorted,
  );
}
