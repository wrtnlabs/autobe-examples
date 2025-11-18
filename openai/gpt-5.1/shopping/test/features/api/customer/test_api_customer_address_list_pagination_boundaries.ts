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

export async function test_api_customer_address_list_pagination_boundaries(
  connection: api.IConnection,
) {
  // 1. Register a new customer (join) and get authorized context
  const customerJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallCustomerJoin.IRequest;

  const customerAuthorized: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerJoinBody,
    });
  typia.assert(customerAuthorized);

  const customerId: string & tags.Format<"uuid"> = customerAuthorized.id;

  // 2. Create admin actor and login
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
  typia.assert(adminAuthorized);

  // explicit admin login to simulate real flow
  const adminLoginBody = {
    email: adminJoinBody.email,
    password: adminJoinBody.password,
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdminLogin.ICreate;
  const adminLoginAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminLoginAuthorized);

  // 3. As admin, create one active country and region
  const countryCode = RandomGenerator.alphabets(2).toUpperCase();

  const countryCreateBody = {
    country_code: countryCode,
    name_en: RandomGenerator.paragraph({ sentences: 2 }),
    phone_code:
      "+" +
      String(
        typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>() % 9999,
      ),
    is_active: true,
    sort_order: typia.random<number & tags.Type<"int32"> & tags.Minimum<0>>(),
  } satisfies IShoppingMallCountry.ICreate;

  const country: IShoppingMallCountry =
    await api.functional.shoppingMall.admin.countries.create(connection, {
      body: countryCreateBody,
    });
  typia.assert(country);

  const regionCreateBody = {
    code: RandomGenerator.alphabets(5),
    name_en: RandomGenerator.paragraph({ sentences: 2 }),
    region_type: null,
    is_active: true,
    sort_order: typia.random<number & tags.Type<"int32"> & tags.Minimum<0>>(),
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

  // 4. Switch back to the customer actor using login
  const customerLoginBody = {
    email: customerJoinBody.email,
    password: customerJoinBody.password,
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallCustomerLogin.IRequest;

  const customerLoginAuthorized: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.login(connection, {
      body: customerLoginBody,
    });
  typia.assert(customerLoginAuthorized);

  // 5. Create exactly 4 addresses for this customer
  const createdAddresses: IShoppingMallCustomerAddress[] = [];

  for (let i = 0; i < 4; i++) {
    const addressCreateBody = {
      shopping_mall_country_id: country.id,
      shopping_mall_region_id: region.id,
      recipient_name: `Recipient ${i + 1}`,
      line1: `Line1-${i + 1}`,
      line2: i % 2 === 0 ? `Line2-${i + 1}` : null,
      city: `City-${i + 1}`,
      postal_code: RandomGenerator.alphaNumeric(6),
      phone_number: RandomGenerator.mobile(),
      is_default: i === 0,
    } satisfies IShoppingMallCustomerAddress.ICreate;

    const created: IShoppingMallCustomerAddress =
      await api.functional.shoppingMall.customer.customers.addresses.create(
        connection,
        {
          customerId,
          body: addressCreateBody,
        },
      );
    typia.assert(created);
    createdAddresses.push(created);
  }

  // Helper to collect address IDs from summary data
  const collectIds = (
    page: IPageIShoppingMallCustomerAddress.ISummary,
  ): Array<string & tags.Format<"uuid">> => page.data.map((it) => it.id);

  // 6. Page 1: page=1, pageSize=2
  const page1Body = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    pageSize: 2 as number & tags.Type<"int32"> & tags.Minimum<1>,
  } satisfies IShoppingMallCustomerAddress.IRequest;

  const page1: IPageIShoppingMallCustomerAddress.ISummary =
    await api.functional.shoppingMall.customer.customers.addresses.index(
      connection,
      {
        customerId,
        body: page1Body,
      },
    );
  typia.assert(page1);

  TestValidator.equals("page1 current page", page1.pagination.current, 1);
  TestValidator.equals("page1 limit", page1.pagination.limit, 2);
  TestValidator.equals("page1 records", page1.pagination.records, 4);
  TestValidator.equals("page1 pages", page1.pagination.pages, 2);
  TestValidator.equals("page1 data length", page1.data.length, 2);

  const page1Ids = collectIds(page1);

  // 7. Page 2: page=2, pageSize=2
  const page2Body = {
    page: 2 as number & tags.Type<"int32"> & tags.Minimum<1>,
    pageSize: 2 as number & tags.Type<"int32"> & tags.Minimum<1>,
  } satisfies IShoppingMallCustomerAddress.IRequest;

  const page2: IPageIShoppingMallCustomerAddress.ISummary =
    await api.functional.shoppingMall.customer.customers.addresses.index(
      connection,
      {
        customerId,
        body: page2Body,
      },
    );
  typia.assert(page2);

  TestValidator.equals("page2 current page", page2.pagination.current, 2);
  TestValidator.equals("page2 limit", page2.pagination.limit, 2);
  TestValidator.equals("page2 records", page2.pagination.records, 4);
  TestValidator.equals("page2 pages", page2.pagination.pages, 2);
  TestValidator.equals("page2 data length", page2.data.length, 2);

  const page2Ids = collectIds(page2);

  // Validate union of page1 and page2 IDs has size 4 and no duplicates
  const combinedIds = [...page1Ids, ...page2Ids];
  const uniqueIds = Array.from(new Set(combinedIds));

  TestValidator.equals(
    "no duplicate addresses across page1 and page2",
    uniqueIds.length,
    4,
  );

  // 8. Page 3: beyond available pages
  const page3Body = {
    page: 3 as number & tags.Type<"int32"> & tags.Minimum<1>,
    pageSize: 2 as number & tags.Type<"int32"> & tags.Minimum<1>,
  } satisfies IShoppingMallCustomerAddress.IRequest;

  const page3: IPageIShoppingMallCustomerAddress.ISummary =
    await api.functional.shoppingMall.customer.customers.addresses.index(
      connection,
      {
        customerId,
        body: page3Body,
      },
    );
  typia.assert(page3);

  TestValidator.equals("page3 current page", page3.pagination.current, 3);
  TestValidator.equals("page3 limit", page3.pagination.limit, 2);
  TestValidator.equals("page3 records", page3.pagination.records, 4);
  TestValidator.equals("page3 pages", page3.pagination.pages, 2);
  TestValidator.equals("page3 data length should be 0", page3.data.length, 0);
}
