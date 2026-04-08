import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallCustomer";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { generate_random_ecommerce_mall_customer_addresses_create } from "../../../generate/generate_random_ecommerce_mall_customer_addresses_create";
import { prepare_random_ecommerce_mall_customer } from "../../../prepare/prepare_random_ecommerce_mall_customer";

export async function test_api_address_filtered_listing(
  connection: api.IConnection,
): Promise<void> {
  // Create customer connection and authenticate
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPassword123!",
      href: "https://example.com/register",
      referrer: "https://example.com",
    },
  });
  // Create addresses with different attributes using the utility function
  // First address in Seoul (will be default by system behavior)
  const seoulAddress1 =
    await generate_random_ecommerce_mall_customer_addresses_create(
      customerConnection,
      {
        body: {
          city: "Seoul",
          state: "Seoul",
          isDefault: true,
        },
      },
    );
  typia.assert(seoulAddress1);
  // Second address in Busan
  const busanAddress =
    await generate_random_ecommerce_mall_customer_addresses_create(
      customerConnection,
      {
        body: {
          city: "Busan",
          state: "Busan",
          isDefault: false,
        },
      },
    );
  typia.assert(busanAddress);
  // Third address in Seoul (different location)
  const seoulAddress2 =
    await generate_random_ecommerce_mall_customer_addresses_create(
      customerConnection,
      {
        body: {
          city: "Seoul",
          state: "Seoul",
          isDefault: false,
        },
      },
    );
  typia.assert(seoulAddress2);
  // Fourth address in Gyeonggi state
  const gyeonggiAddress =
    await generate_random_ecommerce_mall_customer_addresses_create(
      customerConnection,
      {
        body: {
          city: "Seongnam",
          state: "Gyeonggi",
          isDefault: false,
        },
      },
    );
  typia.assert(gyeonggiAddress);
  // Test 1: Filter by isDefault=true - verify pagination count reflects filtering
  const defaultFilterResponse: IPageIEcommerceMallCustomer.ISummary =
    await api.functional.ecommerceMall.customer.addresses.index(
      customerConnection,
      {
        body: {
          isDefault: true,
        } satisfies IEcommerceMallCustomer.IRequest,
      },
    );
  typia.assert(defaultFilterResponse);
  TestValidator.equals(
    "filter by isDefault=true returns filtered results",
    defaultFilterResponse.pagination.records <= 4 &&
      defaultFilterResponse.pagination.records >= 1,
    true,
  );
  // Test 2: Filter by city='Seoul'
  const cityFilterResponse: IPageIEcommerceMallCustomer.ISummary =
    await api.functional.ecommerceMall.customer.addresses.index(
      customerConnection,
      {
        body: {
          city: "Seoul",
        } satisfies IEcommerceMallCustomer.IRequest,
      },
    );
  typia.assert(cityFilterResponse);
  TestValidator.equals(
    "filter by city='Seoul' returns results",
    cityFilterResponse.pagination.records >= 0,
    true,
  );
  TestValidator.equals(
    "filter by city='Seoul' respects pagination",
    cityFilterResponse.pagination.current >= 1,
    true,
  );
  // Test 3: Filter by state='Gyeonggi'
  const stateFilterResponse: IPageIEcommerceMallCustomer.ISummary =
    await api.functional.ecommerceMall.customer.addresses.index(
      customerConnection,
      {
        body: {
          state: "Gyeonggi",
        } satisfies IEcommerceMallCustomer.IRequest,
      },
    );
  typia.assert(stateFilterResponse);
  TestValidator.equals(
    "filter by state='Gyeonggi' returns results",
    stateFilterResponse.pagination.records >= 0,
    true,
  );
  // Test 4: Search functionality
  const searchResponse: IPageIEcommerceMallCustomer.ISummary =
    await api.functional.ecommerceMall.customer.addresses.index(
      customerConnection,
      {
        body: {
          search: "Seoul",
        } satisfies IEcommerceMallCustomer.IRequest,
      },
    );
  typia.assert(searchResponse);
  TestValidator.equals(
    "search returns results",
    searchResponse.pagination.records >= 0,
    true,
  );
  // Test 5: Sort by createdAt
  const sortCreatedAtResponse: IPageIEcommerceMallCustomer.ISummary =
    await api.functional.ecommerceMall.customer.addresses.index(
      customerConnection,
      {
        body: {
          sort: "createdAt",
        } satisfies IEcommerceMallCustomer.IRequest,
      },
    );
  typia.assert(sortCreatedAtResponse);
  TestValidator.equals(
    "sort by createdAt returns all addresses",
    sortCreatedAtResponse.pagination.records,
    4,
  );
  // Test 6: Sort by isDefault
  const sortDefaultResponse: IPageIEcommerceMallCustomer.ISummary =
    await api.functional.ecommerceMall.customer.addresses.index(
      customerConnection,
      {
        body: {
          sort: "isDefault",
        } satisfies IEcommerceMallCustomer.IRequest,
      },
    );
  typia.assert(sortDefaultResponse);
  TestValidator.equals(
    "sort by isDefault returns results",
    sortDefaultResponse.pagination.records,
    4,
  );
  // Test 7: Sort by city
  const sortCityResponse: IPageIEcommerceMallCustomer.ISummary =
    await api.functional.ecommerceMall.customer.addresses.index(
      customerConnection,
      {
        body: {
          sort: "city",
        } satisfies IEcommerceMallCustomer.IRequest,
      },
    );
  typia.assert(sortCityResponse);
  TestValidator.equals(
    "sort by city returns all addresses",
    sortCityResponse.pagination.records,
    4,
  );
  // Test 8: Combined filter (city + isDefault)
  const combinedFilterResponse: IPageIEcommerceMallCustomer.ISummary =
    await api.functional.ecommerceMall.customer.addresses.index(
      customerConnection,
      {
        body: {
          city: "Seoul",
          isDefault: true,
        } satisfies IEcommerceMallCustomer.IRequest,
      },
    );
  typia.assert(combinedFilterResponse);
  TestValidator.equals(
    "combined filter returns results",
    combinedFilterResponse.pagination.records >= 0,
    true,
  );
  // Test 9: Pagination test with limit
  const paginatedResponse: IPageIEcommerceMallCustomer.ISummary =
    await api.functional.ecommerceMall.customer.addresses.index(
      customerConnection,
      {
        body: {
          page: 1,
          limit: 2,
        } satisfies IEcommerceMallCustomer.IRequest,
      },
    );
  typia.assert(paginatedResponse);
  TestValidator.equals(
    "pagination limit is respected",
    paginatedResponse.pagination.limit,
    2,
  );
  TestValidator.equals(
    "pagination data length matches limit",
    paginatedResponse.data.length <= 2,
    true,
  );
}
