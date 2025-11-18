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

/**
 * Basic pagination test for customer shipping address listing.
 *
 * This test verifies that a logged-in customer can retrieve their own shipping
 * addresses with server-side pagination, using a minimal request body that only
 * specifies page and pageSize and leaves all filters and sort options
 * undefined.
 *
 * Business flow:
 *
 * 1. Create and authenticate an admin to set up master data (country/region).
 * 2. Create and authenticate a customer who will own the addresses.
 * 3. As admin, create one active country and a region under that country.
 * 4. As customer, create multiple shipping addresses (at least 3) bound to the
 *    created country and region.
 * 5. Call the address index endpoint with page=1 and pageSize=2 and no filters,
 *    then validate pagination metadata and that exactly two addresses are
 *    returned for the first page.
 * 6. Call the index endpoint again with page=2 to fetch the remaining addresses
 *    and validate there is no duplication across pages and that all returned
 *    addresses are among the created fixtures.
 */
export async function test_api_customer_address_list_basic_pagination(
  connection: api.IConnection,
) {
  // 1. Admin join & login to be able to create country and region.
  const adminJoinInput = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    ip: null,
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/",
  } satisfies IShoppingMallAdminJoin.ICreate;
  const adminAuthorizedFromJoin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinInput,
    });
  typia.assert(adminAuthorizedFromJoin);

  // Explicit admin login (even though join already authenticated) to
  // demonstrate use of IShoppingMallAdminLogin.ICreate and ensure
  // connection Authorization is set for admin flows.
  const adminLoginInput = {
    email: adminJoinInput.email,
    password: adminJoinInput.password,
    ip: null,
    href: "https://admin.example.com/login",
    referrer: "https://admin.example.com/",
  } satisfies IShoppingMallAdminLogin.ICreate;
  const adminAuthorizedFromLogin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: adminLoginInput,
    });
  typia.assert(adminAuthorizedFromLogin);

  // 2. Customer join (this also sets Authorization for customer).
  const customerJoinInput = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    ip: null,
    href: "https://shop.example.com/join",
    referrer: "https://shop.example.com/landing",
  } satisfies IShoppingMallCustomerJoin.IRequest;
  const customerAuthorizedFromJoin: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerJoinInput,
    });
  typia.assert(customerAuthorizedFromJoin);
  const customerId: string & tags.Format<"uuid"> =
    customerAuthorizedFromJoin.id;

  // 3. Switch back to admin to create country & region.
  const adminRelogin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: adminLoginInput,
    });
  typia.assert(adminRelogin);

  // Create a single active country.
  const countryCreateBody = {
    country_code: "KR" + RandomGenerator.alphaNumeric(3),
    name_en: "Test Country " + RandomGenerator.alphabets(5),
    phone_code: "+82",
    is_active: true,
    sort_order: 1 as number & tags.Type<"int32">,
  } satisfies IShoppingMallCountry.ICreate;
  const country: IShoppingMallCountry =
    await api.functional.shoppingMall.admin.countries.create(connection, {
      body: countryCreateBody,
    });
  typia.assert(country);

  // Create a region under that country.
  const regionCreateBody = {
    code: "RG" + RandomGenerator.alphaNumeric(4),
    name_en: "Test Region " + RandomGenerator.alphabets(4),
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

  // 4. Switch to customer account again for address operations.
  const customerLoginInput = {
    email: customerJoinInput.email,
    password: customerJoinInput.password,
    ip: null,
    href: "https://shop.example.com/login",
    referrer: "https://shop.example.com/landing",
  } satisfies IShoppingMallCustomerLogin.IRequest;
  const customerAuthorizedFromLogin: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.login(connection, {
      body: customerLoginInput,
    });
  typia.assert(customerAuthorizedFromLogin);

  // Prepare 3 distinct address creation payloads.
  const addressCreateBodies: IShoppingMallCustomerAddress.ICreate[] = [
    {
      shopping_mall_country_id: country.id,
      shopping_mall_region_id: region.id,
      recipient_name: "Alice Receiver",
      line1: "101 Test Street",
      line2: "Unit 1A",
      city: "Seoul",
      postal_code: "06000",
      phone_number: RandomGenerator.mobile(),
      is_default: true,
    },
    {
      shopping_mall_country_id: country.id,
      shopping_mall_region_id: region.id,
      recipient_name: "Bob Receiver",
      line1: "202 Sample Road",
      line2: null,
      city: "Busan",
      postal_code: "48000",
      phone_number: RandomGenerator.mobile(),
      is_default: false,
    },
    {
      shopping_mall_country_id: country.id,
      shopping_mall_region_id: region.id,
      recipient_name: "Carol Receiver",
      line1: "303 Example Ave",
      line2: "Floor 3",
      city: "Incheon",
      postal_code: "22000",
      phone_number: RandomGenerator.mobile(),
      is_default: false,
    },
  ];

  const createdAddresses: IShoppingMallCustomerAddress[] = [];
  for (const createBody of addressCreateBodies) {
    const created =
      await api.functional.shoppingMall.customer.customers.addresses.create(
        connection,
        {
          customerId,
          body: createBody,
        },
      );
    typia.assert(created);
    createdAddresses.push(created);
  }

  const createdCount = createdAddresses.length;

  // 5. Page 1 request with page=1, pageSize=2, other filters omitted.
  const page1RequestBody = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    pageSize: 2 as number & tags.Type<"int32"> & tags.Minimum<1>,
  } satisfies IShoppingMallCustomerAddress.IRequest;
  const page1: IPageIShoppingMallCustomerAddress.ISummary =
    await api.functional.shoppingMall.customer.customers.addresses.index(
      connection,
      {
        customerId,
        body: page1RequestBody,
      },
    );
  typia.assert(page1);

  // Basic pagination metadata checks.
  TestValidator.equals(
    "pagination.current should be 1 on first page",
    1 as number & tags.Type<"int32"> & tags.Minimum<0>,
    page1.pagination.current,
  );
  TestValidator.equals(
    "pagination.limit should equal requested pageSize (2)",
    2 as number & tags.Type<"int32"> & tags.Minimum<0>,
    page1.pagination.limit,
  );
  TestValidator.predicate(
    "pagination.records should be at least number of created addresses",
    page1.pagination.records >= createdCount,
  );
  TestValidator.equals(
    "pagination.pages should be consistent with records and limit",
    Math.ceil(page1.pagination.records / page1.pagination.limit),
    page1.pagination.pages,
  );

  // Data length and ownership checks on page 1.
  TestValidator.equals("page1.data length should be 2", page1.data.length, 2);

  for (const summary of page1.data) {
    // Country id should match our created country.
    TestValidator.equals(
      "summary.country.id should equal created country id",
      country.id,
      summary.country.id,
    );

    // Region may be null, but when present its id should match region.id.
    if (summary.region !== null && summary.region !== undefined) {
      TestValidator.equals(
        "summary.region.id should equal created region id when region set",
        region.id,
        summary.region.id,
      );
    }
  }

  // Ensure at least one summary on page1 matches one of our created fixtures
  // in core address fields.
  const page1Ids = page1.data.map((d) => d.id);
  const matchExists = createdAddresses.some((created) =>
    page1.data.some(
      (summary) =>
        summary.id === created.id &&
        summary.recipient_name === created.recipient_name &&
        summary.line1 === created.line1 &&
        summary.city === created.city &&
        summary.postal_code === created.postal_code &&
        summary.phone_number === created.phone_number &&
        summary.is_default === created.is_default,
    ),
  );
  TestValidator.predicate(
    "at least one page1 summary should match a created address by core fields",
    matchExists,
  );

  // 6. Page 2 request to fetch remaining addresses.
  const page2RequestBody = {
    page: 2 as number & tags.Type<"int32"> & tags.Minimum<1>,
    pageSize: 2 as number & tags.Type<"int32"> & tags.Minimum<1>,
  } satisfies IShoppingMallCustomerAddress.IRequest;
  const page2: IPageIShoppingMallCustomerAddress.ISummary =
    await api.functional.shoppingMall.customer.customers.addresses.index(
      connection,
      {
        customerId,
        body: page2RequestBody,
      },
    );
  typia.assert(page2);

  TestValidator.equals(
    "pagination.current should be 2 on second page",
    2 as number & tags.Type<"int32"> & tags.Minimum<0>,
    page2.pagination.current,
  );

  const page2Ids = page2.data.map((d) => d.id);

  // No duplication across page1 and page2 ids.
  const intersection = page1Ids.filter((id) => page2Ids.includes(id));
  TestValidator.equals(
    "no duplicated ids between page1 and page2",
    0,
    intersection.length,
  );

  // Combined ids should all come from our created set (subset check).
  const createdIdSet = new Set(createdAddresses.map((addr) => addr.id));
  const allListedIds = [...page1Ids, ...page2Ids];
  const allIdsFromCreated = allListedIds.every((id) => createdIdSet.has(id));
  TestValidator.predicate(
    "all ids from page1 and page2 should belong to created addresses",
    allIdsFromCreated,
  );
}
