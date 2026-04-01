import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAddress";
import type { IShoppingMallAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAddress";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { generate_random_shopping_mall_customer_addresses_create } from "../../../generate/generate_random_shopping_mall_customer_addresses_create";
import { prepare_random_shopping_mall_address } from "../../../prepare/prepare_random_shopping_mall_address";

export async function test_api_customer_address_search_by_recipient_and_location(
  connection: api.IConnection,
): Promise<void> {
  // 1. Customer joins the platform
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPassword123!",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallCustomer.IJoin,
  });
  typia.assert(customer);
  // 2. Create multiple addresses with varying recipient names, cities, and countries
  const addresses: IShoppingMallAddress[] = [];
  // Address 1: John in Seoul, South Korea
  const address1 =
    await generate_random_shopping_mall_customer_addresses_create(
      customerConnection,
      {
        body: {
          recipientName: "John Smith",
          recipientPhone: RandomGenerator.mobile(),
          streetAddress: "123 Gangnam-daero",
          city: "Seoul",
          state: "Seoul",
          postalCode: "06000",
          country: "South Korea",
        } satisfies IShoppingMallAddress.ICreate,
      },
    );
  typia.assert(address1);
  addresses.push(address1);
  // Address 2: John in Busan, South Korea
  const address2 =
    await generate_random_shopping_mall_customer_addresses_create(
      customerConnection,
      {
        body: {
          recipientName: "John Doe",
          recipientPhone: RandomGenerator.mobile(),
          streetAddress: "456 Haeundaehaeon-ro",
          city: "Busan",
          state: "Busan",
          postalCode: "48000",
          country: "South Korea",
        } satisfies IShoppingMallAddress.ICreate,
      },
    );
  typia.assert(address2);
  addresses.push(address2);
  // Address 3: Jane in Seoul, South Korea
  const address3 =
    await generate_random_shopping_mall_customer_addresses_create(
      customerConnection,
      {
        body: {
          recipientName: "Jane Wilson",
          recipientPhone: RandomGenerator.mobile(),
          streetAddress: "789 Teheran-ro",
          city: "Seoul",
          state: "Seoul",
          postalCode: "06100",
          country: "South Korea",
        } satisfies IShoppingMallAddress.ICreate,
      },
    );
  typia.assert(address3);
  addresses.push(address3);
  // Address 4: Alice in Tokyo, Japan
  const address4 =
    await generate_random_shopping_mall_customer_addresses_create(
      customerConnection,
      {
        body: {
          recipientName: "Alice Brown",
          recipientPhone: RandomGenerator.mobile(),
          streetAddress: "1-2-3 Shibuya",
          city: "Tokyo",
          state: "Tokyo",
          postalCode: "150-0001",
          country: "Japan",
        } satisfies IShoppingMallAddress.ICreate,
      },
    );
  typia.assert(address4);
  addresses.push(address4);
  // 3. Search addresses by partial recipient name "John"
  const johnSearch = await api.functional.shoppingMall.customer.addresses.index(
    customerConnection,
    {
      body: {
        search: "John",
      } satisfies IShoppingMallAddress.IRequest,
    },
  );
  typia.assert(johnSearch);
  // Verify only addresses with "John" in recipient name are returned
  TestValidator.predicate("search returns addresses with John in name", () =>
    johnSearch.data.every((addr) => addr.recipientName.includes("John")),
  );
  TestValidator.predicate(
    "search returns exactly 2 addresses for John",
    () => johnSearch.data.length === 2,
  );
  // 4. Filter addresses by city "Seoul"
  const seoulFilter =
    await api.functional.shoppingMall.customer.addresses.index(
      customerConnection,
      {
        body: {
          city: "Seoul",
        } satisfies IShoppingMallAddress.IRequest,
      },
    );
  typia.assert(seoulFilter);
  // Verify only addresses in Seoul are returned
  TestValidator.predicate("city filter returns only Seoul addresses", () =>
    seoulFilter.data.every((addr) => addr.city === "Seoul"),
  );
  TestValidator.predicate(
    "city filter returns exactly 2 addresses for Seoul",
    () => seoulFilter.data.length === 2,
  );
  // 5. Filter addresses by country "South Korea"
  const koreaFilter =
    await api.functional.shoppingMall.customer.addresses.index(
      customerConnection,
      {
        body: {
          country: "South Korea",
        } satisfies IShoppingMallAddress.IRequest,
      },
    );
  typia.assert(koreaFilter);
  // Verify only addresses in South Korea are returned
  TestValidator.predicate(
    "country filter returns only South Korea addresses",
    () => koreaFilter.data.every((addr) => addr.country === "South Korea"),
  );
  TestValidator.predicate(
    "country filter returns exactly 3 addresses for South Korea",
    () => koreaFilter.data.length === 3,
  );
  // 6. Test combined filters (city + search)
  const combinedFilter =
    await api.functional.shoppingMall.customer.addresses.index(
      customerConnection,
      {
        body: {
          search: "John",
          city: "Seoul",
        } satisfies IShoppingMallAddress.IRequest,
      },
    );
  typia.assert(combinedFilter);
  // Verify combined filter returns only John's address in Seoul
  TestValidator.predicate("combined filter returns John in Seoul", () =>
    combinedFilter.data.every(
      (addr) => addr.recipientName.includes("John") && addr.city === "Seoul",
    ),
  );
  TestValidator.predicate(
    "combined filter returns exactly 1 address",
    () => combinedFilter.data.length === 1,
  );
  // 7. Test empty results when no match
  const emptySearch =
    await api.functional.shoppingMall.customer.addresses.index(
      customerConnection,
      {
        body: {
          search: "NonExistentName",
        } satisfies IShoppingMallAddress.IRequest,
      },
    );
  typia.assert(emptySearch);
  TestValidator.equals(
    "empty search returns no results",
    emptySearch.data.length,
    0,
  );
  // 8. Verify pagination metadata is correct
  TestValidator.predicate(
    "pagination current page is 1",
    () => johnSearch.pagination.current === 1,
  );
  TestValidator.predicate(
    "pagination records count matches data length",
    () => johnSearch.pagination.records === johnSearch.data.length,
  );
}
