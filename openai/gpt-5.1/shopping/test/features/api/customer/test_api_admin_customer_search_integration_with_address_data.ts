import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCustomer";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallAdminLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminLogin";
import type { IShoppingMallCountry } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCountry";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerAddress";
import type { IShoppingMallCustomerJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerJoin";
import type { IShoppingMallCustomerLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerLogin";
import type { IShoppingMallRegion } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRegion";

export async function test_api_admin_customer_search_integration_with_address_data(
  connection: api.IConnection,
) {
  // 1. Admin joins (registration also authenticates and sets Authorization header)
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "Admin1234!" as string & tags.Format<"password">,
    href: "https://admin.example.com/join" as string & tags.Format<"uri">,
    referrer: "https://admin.example.com/" as string & tags.Format<"uri">,
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 2. Create a country master
  const countryCodeBase = RandomGenerator.alphabets(3).toUpperCase();
  const countryCreateBody = {
    country_code: countryCodeBase,
    name_en: `Country ${countryCodeBase}`,
    phone_code: "+82",
    is_active: true,
    sort_order: 1 as number & tags.Type<"int32">,
  } satisfies IShoppingMallCountry.ICreate;

  const country: IShoppingMallCountry =
    await api.functional.shoppingMall.admin.countries.create(connection, {
      body: countryCreateBody,
    });
  typia.assert(country);

  // 3. Create a region for that country
  const regionCode = RandomGenerator.alphabets(5).toUpperCase();
  const regionCreateBody = {
    code: regionCode,
    name_en: `Region ${regionCode}`,
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

  // Helper to build customer join body
  const buildCustomerJoinBody = (
    email: string & tags.Format<"email">,
  ): IShoppingMallCustomerJoin.IRequest => {
    return {
      email,
      password: "Customer1234!" as string & tags.Format<"password">,
      href: "https://shop.example.com/join" as string & tags.Format<"uri">,
      referrer: "https://shop.example.com/" as string & tags.Format<"uri">,
      ip: "127.0.0.1" as string & tags.Format<"ipv4">,
    } satisfies IShoppingMallCustomerJoin.IRequest;
  };

  // 4. Create multiple customers (some will get addresses, some not)
  const totalCustomers = 6;
  const customers: IShoppingMallCustomer.IAuthorized[] = [];

  for (let i = 0; i < totalCustomers; i += 1) {
    const email = typia.random<string & tags.Format<"email">>();
    const joinBody = buildCustomerJoinBody(email);

    const customer: IShoppingMallCustomer.IAuthorized =
      await api.functional.auth.customer.join(connection, {
        body: joinBody,
      });
    typia.assert(customer);
    customers.push(customer);
  }

  TestValidator.equals(
    "total customers created in this test",
    customers.length,
    totalCustomers,
  );

  // We'll attach addresses only to the first half of the customers
  const customersWithAddresses = customers.slice(0, totalCustomers / 2);
  const customersWithoutAddresses = customers.slice(totalCustomers / 2);

  // 5. For subset of customers, create addresses via customer-scoped API
  const addresses: IShoppingMallCustomerAddress[] = [];

  for (const customer of customersWithAddresses) {
    // Switch authentication to the customer before creating their address
    const customerLoginBody = {
      email: customer.email,
      password: "Customer1234!",
      href: "https://shop.example.com/login" as string & tags.Format<"uri">,
      referrer: "https://shop.example.com/" as string & tags.Format<"uri">,
      ip: "127.0.0.1",
    } satisfies IShoppingMallCustomerLogin.IRequest;

    const customerLogin: IShoppingMallCustomer.IAuthorized =
      await api.functional.auth.customer.login(connection, {
        body: customerLoginBody,
      });
    typia.assert(customerLogin);

    const addressCreateBody = {
      shopping_mall_country_id: country.id,
      shopping_mall_region_id: region.id,
      recipient_name: RandomGenerator.name(2),
      line1: RandomGenerator.paragraph({ sentences: 2 }),
      line2: null,
      city: "Seoul",
      postal_code: "12345",
      phone_number: RandomGenerator.mobile(),
      is_default: true,
    } satisfies IShoppingMallCustomerAddress.ICreate;

    const address: IShoppingMallCustomerAddress =
      await api.functional.shoppingMall.customer.customers.addresses.create(
        connection,
        {
          customerId: customer.id,
          body: addressCreateBody,
        },
      );
    typia.assert(address);
    addresses.push(address);
  }

  TestValidator.equals(
    "customers with addresses should equal half of total customers",
    customersWithAddresses.length,
    addresses.length,
  );

  // 6. Re-authenticate as admin to perform customer searches
  const adminLoginBody = {
    email: adminAuthorized.email,
    password: adminJoinBody.password,
    href: "https://admin.example.com/login" as string & tags.Format<"uri">,
    referrer: "https://admin.example.com/" as string & tags.Format<"uri">,
    ip: "127.0.0.1" as string & tags.Format<"ipv4">,
  } satisfies IShoppingMallAdminLogin.ICreate;

  const adminLogin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminLogin);

  // Helper to execute admin customer search
  const searchCustomers = async (
    body: IShoppingMallCustomer.IRequest,
  ): Promise<IPageIShoppingMallCustomer.ISummary> => {
    const page: IPageIShoppingMallCustomer.ISummary =
      await api.functional.shoppingMall.admin.customers.index(connection, {
        body,
      });
    typia.assert(page);
    return page;
  };

  // 7. Basic search with pagination, ignoring whether addresses exist
  const baseSearchBody: IShoppingMallCustomer.IRequest = {
    page: 1 as number & tags.Type<"int32">,
    limit: 20 as number & tags.Type<"int32">,
  };

  const basePage = await searchCustomers(baseSearchBody);

  // We cannot guarantee total record count, but we can ensure no runtime errors
  TestValidator.predicate(
    "base search returns non-negative total records",
    basePage.pagination.records >= 0,
  );

  // 8. Search using status filter; ensure that the query executes correctly
  const statusSearchBody: IShoppingMallCustomer.IRequest = {
    page: 1 as number & tags.Type<"int32">,
    limit: 50 as number & tags.Type<"int32">,
    status: customers[0].status,
  };

  const statusPage = await searchCustomers(statusSearchBody);

  TestValidator.predicate(
    "status-filtered search returns only customers with requested status",
    statusPage.data.every((summary) => summary.status === customers[0].status),
  );

  // 9. Search by email of a customer with address
  const targetWithAddress = customersWithAddresses[0];
  const emailSearchBody: IShoppingMallCustomer.IRequest = {
    page: 1 as number & tags.Type<"int32">,
    limit: 10 as number & tags.Type<"int32">,
    email: targetWithAddress.email,
  };

  const emailPage = await searchCustomers(emailSearchBody);

  TestValidator.predicate(
    "email-filtered search returns at least one record",
    emailPage.pagination.records >= 1,
  );
  TestValidator.predicate(
    "email-filtered search includes the target customer with address",
    emailPage.data.some((summary) => summary.id === targetWithAddress.id),
  );

  // 10. Search by email of a customer without address
  const targetWithoutAddress = customersWithoutAddresses[0];
  const emailNoAddrBody: IShoppingMallCustomer.IRequest = {
    page: 1 as number & tags.Type<"int32">,
    limit: 10 as number & tags.Type<"int32">,
    email: targetWithoutAddress.email,
  };

  const emailNoAddrPage = await searchCustomers(emailNoAddrBody);

  TestValidator.predicate(
    "email-filtered search for customer without address returns at least one record",
    emailNoAddrPage.pagination.records >= 1,
  );
  TestValidator.predicate(
    "email-filtered search for customer without address includes that customer",
    emailNoAddrPage.data.some(
      (summary) => summary.id === targetWithoutAddress.id,
    ),
  );

  // 11. Ensure pagination metadata is consistent regardless of addresses
  const paginatedBody: IShoppingMallCustomer.IRequest = {
    page: 1 as number & tags.Type<"int32">,
    limit: 2 as number & tags.Type<"int32">,
  };

  const paginatedPage = await searchCustomers(paginatedBody);

  TestValidator.predicate(
    "pagination limit should be respected",
    paginatedPage.data.length <= paginatedPage.pagination.limit,
  );
  TestValidator.predicate(
    "pagination pages count should be positive when records exist",
    paginatedPage.pagination.records === 0
      ? paginatedPage.pagination.pages === 0
      : paginatedPage.pagination.pages >= 1,
  );
}
