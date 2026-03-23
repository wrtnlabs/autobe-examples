import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAddress";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallAddress";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { generate_random_ecommerce_mall_customer_addresses_create } from "../../../generate/generate_random_ecommerce_mall_customer_addresses_create";
import { prepare_random_ecommerce_mall_address } from "../../../prepare/prepare_random_ecommerce_mall_address";

export async function test_api_customer_address_search_trigram(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create customer account
  const customerConnection: api.IConnection = { host: connection.host };
  const email = typia.assert<string & tags.MinLength<1> & tags.Format<"email">>(
    typia.random<string & tags.Format<"email">>()
  );
  const customerData = {
    email,
    password: RandomGenerator.alphaNumeric(16),
    name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
  } satisfies IEcommerceMallCustomer.IJoin;
  const authorized = await authorize_customer_join(customerConnection, {
    body: customerData,
  });
  typia.assert(authorized);
  // 2. Create multiple addresses with varied text content
  const addresses = ArrayUtil.repeat(
    5,
    (i) =>
      ({
        recipient_name:
          i === 0
            ? "John Smith"
            : i === 1
              ? "Jane Doe"
              : i === 2
                ? "Main Street Receiver"
                : i === 3
                  ? "Downtown Address"
                  : "Another Person",
        phone_number: RandomGenerator.mobile(),
        street_address:
          i === 0
            ? "123 Main St"
            : i === 1
              ? "456 Oak Avenue"
              : i === 2
                ? "789 Main Street"
                : i === 3
                  ? "101 Downtown Blvd"
                  : "321 Somewhere Lane",
        city:
          i === 0
            ? "New York"
            : i === 1
              ? "Los Angeles"
              : i === 2
                ? "Chicago"
                : i === 3
                  ? "Miami"
                  : "Seattle",
        state_province: "CA",
        postal_code: "90210",
        country: "USA",
        is_default: i === 0,
      }) satisfies IEcommerceMallAddress.ICreate,
  );
  for (const address of addresses) {
    const created =
      await api.functional.ecommerceMall.customer.addresses.create(
        customerConnection,
        {
          body: address,
        },
      );
    typia.assert(created);
  }
  // 3. Test trigram search with partial text 'Main'
  const mainSearch =
    await api.functional.ecommerceMall.customer.addresses.index(
      customerConnection,
      {
        body: {
          limit: 10,
          search: "Main",
        },
      },
    );
  typia.assert(mainSearch);
  TestValidator.equals(
    "main search returns addresses with 'Main'",
    mainSearch.data.length,
    2,
  );
  TestValidator.predicate(
    "main search has correct results",
    mainSearch.data.every(
      (addr) =>
        addr.recipient_name.includes("Main") ||
        addr.street_address.includes("Main") ||
        addr.city.includes("Main"),
    ),
  );
  // 4. Test search with 'St' partial text
  const stSearch = await api.functional.ecommerceMall.customer.addresses.index(
    customerConnection,
    {
      body: {
        limit: 10,
        search: "St",
      },
    },
  );
  typia.assert(stSearch);
  TestValidator.predicate(
    "st search returns addresses with 'St'",
    stSearch.data.every(
      (addr) =>
        addr.recipient_name.includes("St") ||
        addr.street_address.includes("St") ||
        addr.city.includes("St"),
    ),
  );
  // 5. Test search with non-existent text
  const noMatchSearch =
    await api.functional.ecommerceMall.customer.addresses.index(
      customerConnection,
      {
        body: {
          limit: 10,
          search: "XyzNonExistent123",
        },
      },
    );
  typia.assert(noMatchSearch);
  TestValidator.equals(
    "no match search returns empty array",
    noMatchSearch.data.length,
    0,
  );
  // 6. Test search with specific city 'New York'
  const newYorkSearch =
    await api.functional.ecommerceMall.customer.addresses.index(
      customerConnection,
      {
        body: {
          limit: 10,
          search: "New York",
        },
      },
    );
  typia.assert(newYorkSearch);
  TestValidator.equals(
    "new york search returns correct count",
    newYorkSearch.data.length,
    1,
  );
  TestValidator.equals(
    "new york search returns correct address",
    newYorkSearch.data[0].city,
    "New York",
  );
}