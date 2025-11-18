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
 * Verify that customer address listing is strictly scoped to the authenticated
 * customer and that cross-customer access is rejected, using PATCH
 * /shoppingMall/customer/customers/{customerId}/addresses.
 *
 * Business goals:
 *
 * - Ensure that a logged-in customer can list their own addresses via the index
 *   endpoint.
 * - Ensure that a customer cannot list another customer’s addresses even if they
 *   know the other customerId.
 * - Confirm that address data returned for a customer does not include any
 *   records owned by other customers.
 *
 * Scenario steps implemented:
 *
 * 1. Admin joins and creates one country and one region.
 * 2. Customer A joins (and becomes authenticated), and we record customerAId.
 * 3. Customer B joins (token switches to B), and we record customerBId.
 * 4. We log back in as customer A and create two addresses for A.
 * 5. We log in as customer B and create one address for B.
 * 6. We log in as A and list addresses for customerAId, asserting that only A’s
 *    addresses appear and that at least one is returned.
 * 7. Still as A, we attempt to list addresses for customerBId and assert that the
 *    call fails via TestValidator.error (without checking status codes).
 * 8. We log in as B, attempt to list addresses for customerAId and assert failure
 *    via TestValidator.error.
 * 9. Still as B, we list addresses for customerBId and assert that only B’s
 *    addresses appear and that at least one is returned.
 *
 * Technical constraints and patterns:
 *
 * - Only approved SDK functions and DTOs are used.
 * - All API calls are awaited and all non-void responses are validated with
 *   typia.assert.
 * - TestValidator is used only for business logic and error expectations (not for
 *   type or HTTP status validation) and always with a descriptive title.
 * - No direct access or mutation of connection.headers; authentication tokens are
 *   managed solely by the SDK join/login functions.
 * - No type-unsafe constructs such as `any`, `as any`, or `satisfies any` are
 *   used.
 */
export async function test_api_customer_address_list_ownership_enforcement(
  connection: api.IConnection,
) {
  // 1. Admin joins and creates country + region
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuth: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuth);

  const countryCreateBody = {
    country_code: "KR",
    name_en: "Korea, Republic of",
    phone_code: "+82",
    is_active: true,
    sort_order: 1 as number & tags.Type<"int32">,
  } satisfies IShoppingMallCountry.ICreate;

  const country: IShoppingMallCountry =
    await api.functional.shoppingMall.admin.countries.create(connection, {
      body: countryCreateBody,
    });
  typia.assert(country);

  const regionCreateBody = {
    code: "SEOUL",
    name_en: "Seoul",
    region_type: "city",
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

  // 2. Customer A join
  const customerAJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallCustomerJoin.IRequest;

  const customerAAuth: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerAJoinBody,
    });
  typia.assert(customerAAuth);
  const customerAId = customerAAuth.id;

  // 3. Customer B join
  const customerBJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallCustomerJoin.IRequest;

  const customerBAuth: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerBJoinBody,
    });
  typia.assert(customerBAuth);
  const customerBId = customerBAuth.id;

  // 4. Customer A creates multiple addresses (re-authenticate as A to align token)
  const customerALoginForCreateBody = {
    email: customerAJoinBody.email,
    password: customerAJoinBody.password,
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallCustomerLogin.IRequest;

  const customerALoginForCreateAuth: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.login(connection, {
      body: customerALoginForCreateBody,
    });
  typia.assert(customerALoginForCreateAuth);

  const addressA1Body = {
    shopping_mall_country_id: country.id,
    shopping_mall_region_id: region.id,
    recipient_name: "Customer A Primary",
    line1: "123 A Street",
    line2: null,
    city: "Seoul",
    postal_code: "06000",
    phone_number: RandomGenerator.mobile(),
    is_default: true,
  } satisfies IShoppingMallCustomerAddress.ICreate;

  const addressA1: IShoppingMallCustomerAddress =
    await api.functional.shoppingMall.customer.customers.addresses.create(
      connection,
      {
        customerId: customerAId,
        body: addressA1Body,
      },
    );
  typia.assert(addressA1);

  const addressA2Body = {
    shopping_mall_country_id: country.id,
    shopping_mall_region_id: null,
    recipient_name: "Customer A Secondary",
    line1: "456 A Avenue",
    line2: "Unit 2",
    city: "Incheon",
    postal_code: "22000",
    phone_number: RandomGenerator.mobile(),
    is_default: false,
  } satisfies IShoppingMallCustomerAddress.ICreate;

  const addressA2: IShoppingMallCustomerAddress =
    await api.functional.shoppingMall.customer.customers.addresses.create(
      connection,
      {
        customerId: customerAId,
        body: addressA2Body,
      },
    );
  typia.assert(addressA2);

  const customerAAddressIds = [addressA1.id, addressA2.id];

  // 5. Customer B creates distinct addresses
  const customerBLoginBody = {
    email: customerBJoinBody.email,
    password: customerBJoinBody.password,
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallCustomerLogin.IRequest;

  const customerBLoginAuth: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.login(connection, {
      body: customerBLoginBody,
    });
  typia.assert(customerBLoginAuth);

  const addressB1Body = {
    shopping_mall_country_id: country.id,
    shopping_mall_region_id: region.id,
    recipient_name: "Customer B Primary",
    line1: "789 B Road",
    line2: null,
    city: "Busan",
    postal_code: "48000",
    phone_number: RandomGenerator.mobile(),
    is_default: true,
  } satisfies IShoppingMallCustomerAddress.ICreate;

  const addressB1: IShoppingMallCustomerAddress =
    await api.functional.shoppingMall.customer.customers.addresses.create(
      connection,
      {
        customerId: customerBId,
        body: addressB1Body,
      },
    );
  typia.assert(addressB1);

  const customerBAddressIds = [addressB1.id];

  // 6. Positive case: Customer A lists their own addresses
  const customerALoginBody = {
    email: customerAJoinBody.email,
    password: customerAJoinBody.password,
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallCustomerLogin.IRequest;

  const customerALoginAuth: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.login(connection, {
      body: customerALoginBody,
    });
  typia.assert(customerALoginAuth);

  const listARequestBody = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    pageSize: 10 as number & tags.Type<"int32"> & tags.Minimum<1>,
    sortKey: "created_at",
    sortDirection: "desc",
    countryId: undefined,
    regionId: undefined,
    q: undefined,
  } satisfies IShoppingMallCustomerAddress.IRequest;

  const listAResult: IPageIShoppingMallCustomerAddress.ISummary =
    await api.functional.shoppingMall.customer.customers.addresses.index(
      connection,
      {
        customerId: customerAId as string & tags.Format<"uuid">,
        body: listARequestBody,
      },
    );
  typia.assert(listAResult);

  TestValidator.predicate(
    "customer A list contains at least one address",
    listAResult.data.length > 0,
  );

  for (const addr of listAResult.data) {
    const isA = customerAAddressIds.includes(addr.id);
    const isB = customerBAddressIds.includes(addr.id);

    TestValidator.predicate(
      "all addresses in A listing belong to customer A",
      isA && !isB,
    );
  }

  // 7. Negative case: Customer A attempts to list Customer B’s addresses
  await TestValidator.error(
    "customer A cannot list customer B addresses",
    async () => {
      const crossRequestBody = {
        page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
        pageSize: 10 as number & tags.Type<"int32"> & tags.Minimum<1>,
        sortKey: "created_at",
        sortDirection: "desc",
        countryId: undefined,
        regionId: undefined,
        q: undefined,
      } satisfies IShoppingMallCustomerAddress.IRequest;

      await api.functional.shoppingMall.customer.customers.addresses.index(
        connection,
        {
          customerId: customerBId as string & tags.Format<"uuid">,
          body: crossRequestBody,
        },
      );
    },
  );

  // 8. Symmetric negative case: Customer B attempts to list Customer A’s addresses
  const customerBReloginBody = {
    email: customerBJoinBody.email,
    password: customerBJoinBody.password,
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallCustomerLogin.IRequest;

  const customerBReloginAuth: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.login(connection, {
      body: customerBReloginBody,
    });
  typia.assert(customerBReloginAuth);

  await TestValidator.error(
    "customer B cannot list customer A addresses",
    async () => {
      const crossRequestBody = {
        page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
        pageSize: 10 as number & tags.Type<"int32"> & tags.Minimum<1>,
        sortKey: "created_at",
        sortDirection: "desc",
        countryId: undefined,
        regionId: undefined,
        q: undefined,
      } satisfies IShoppingMallCustomerAddress.IRequest;

      await api.functional.shoppingMall.customer.customers.addresses.index(
        connection,
        {
          customerId: customerAId as string & tags.Format<"uuid">,
          body: crossRequestBody,
        },
      );
    },
  );

  // 9. Final positive sanity check: Customer B lists their own addresses
  const listBRequestBody = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    pageSize: 10 as number & tags.Type<"int32"> & tags.Minimum<1>,
    sortKey: "created_at",
    sortDirection: "desc",
    countryId: undefined,
    regionId: undefined,
    q: undefined,
  } satisfies IShoppingMallCustomerAddress.IRequest;

  const listBResult: IPageIShoppingMallCustomerAddress.ISummary =
    await api.functional.shoppingMall.customer.customers.addresses.index(
      connection,
      {
        customerId: customerBId as string & tags.Format<"uuid">,
        body: listBRequestBody,
      },
    );
  typia.assert(listBResult);

  TestValidator.predicate(
    "customer B list contains at least one address",
    listBResult.data.length > 0,
  );

  for (const addr of listBResult.data) {
    const isA = customerAAddressIds.includes(addr.id);
    const isB = customerBAddressIds.includes(addr.id);

    TestValidator.predicate(
      "all addresses in B listing belong to customer B",
      isB && !isA,
    );
  }
}
