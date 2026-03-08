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

export async function test_api_customer_address_search_by_recipient_name(
  connection: api.IConnection,
): Promise<void> {
  // 1. Customer authentication
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: null,
    } satisfies IEcommerceMallCustomer.IJoin,
  });
  typia.assert(customer);
  // 2. Test recipient_name filter - partial text matching
  const johnSearch =
    await api.functional.ecommerceMall.customer.addresses.index(
      customerConnection,
      {
        body: {
          recipient_name: "John",
        } satisfies IEcommerceMallAddress.IRequest,
      },
    );
  typia.assert(johnSearch);
  TestValidator.predicate(
    "recipient_name search returns paginated result",
    johnSearch.pagination.records >= 0,
  );
  // 3. Test recipient_name filter with exact match
  const janeSearch =
    await api.functional.ecommerceMall.customer.addresses.index(
      customerConnection,
      {
        body: {
          recipient_name: "Jane",
        } satisfies IEcommerceMallAddress.IRequest,
      },
    );
  typia.assert(janeSearch);
  TestValidator.predicate(
    "Jane recipient search returns paginated result",
    janeSearch.pagination.records >= 0,
  );
  // 4. Test general search parameter - searches across recipient_name, phone_number, street_address, and city
  const streetSearch =
    await api.functional.ecommerceMall.customer.addresses.index(
      customerConnection,
      {
        body: {
          search: "Main",
        } satisfies IEcommerceMallAddress.IRequest,
      },
    );
  typia.assert(streetSearch);
  TestValidator.predicate(
    "general search returns paginated result",
    streetSearch.pagination.records >= 0,
  );
  // 5. Test city name search
  const seoulSearch =
    await api.functional.ecommerceMall.customer.addresses.index(
      customerConnection,
      {
        body: {
          search: "Seoul",
        } satisfies IEcommerceMallAddress.IRequest,
      },
    );
  typia.assert(seoulSearch);
  TestValidator.predicate(
    "city search returns paginated result",
    seoulSearch.pagination.records >= 0,
  );
  // 6. Test pagination with page and limit parameters
  const paginatedSearch =
    await api.functional.ecommerceMall.customer.addresses.index(
      customerConnection,
      {
        body: {
          page: 1,
          limit: 2,
        } satisfies IEcommerceMallAddress.IRequest,
      },
    );
  typia.assert(paginatedSearch);
  TestValidator.equals(
    "pagination current page",
    paginatedSearch.pagination.current,
    1,
  );
  TestValidator.equals("pagination limit", paginatedSearch.pagination.limit, 2);
  TestValidator.predicate(
    "pagination has non-negative records",
    paginatedSearch.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination has non-negative pages",
    paginatedSearch.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "first page returns valid data array",
    paginatedSearch.data.length >= 0,
  );
  // 7. Test pagination with different page number
  const page2Search =
    await api.functional.ecommerceMall.customer.addresses.index(
      customerConnection,
      {
        body: {
          page: 2,
          limit: 5,
        } satisfies IEcommerceMallAddress.IRequest,
      },
    );
  typia.assert(page2Search);
  TestValidator.equals(
    "page 2 current page",
    page2Search.pagination.current,
    2,
  );
  TestValidator.equals("page 2 limit", page2Search.pagination.limit, 5);
  // 8. Test no results for non-existent recipient
  const noMatchSearch =
    await api.functional.ecommerceMall.customer.addresses.index(
      customerConnection,
      {
        body: {
          recipient_name: "NonExistentRecipient12345",
        } satisfies IEcommerceMallAddress.IRequest,
      },
    );
  typia.assert(noMatchSearch);
  TestValidator.equals(
    "no match search returns empty data",
    noMatchSearch.data.length,
    0,
  );
  TestValidator.equals(
    "no match search has zero records",
    noMatchSearch.pagination.records,
    0,
  );
  // 9. Test combined filters - recipient_name and is_default
  const defaultSearch =
    await api.functional.ecommerceMall.customer.addresses.index(
      customerConnection,
      {
        body: {
          is_default: true,
        } satisfies IEcommerceMallAddress.IRequest,
      },
    );
  typia.assert(defaultSearch);
  TestValidator.predicate(
    "default address search returns paginated result",
    defaultSearch.pagination.records >= 0,
  );
  TestValidator.predicate(
    "all results are default addresses",
    defaultSearch.data.every((addr) => addr.is_default === true),
  );
  // 10. Test phone_number filter - partial text matching
  const phoneSearch =
    await api.functional.ecommerceMall.customer.addresses.index(
      customerConnection,
      {
        body: {
          phone_number: "010",
        } satisfies IEcommerceMallAddress.IRequest,
      },
    );
  typia.assert(phoneSearch);
  TestValidator.predicate(
    "phone_number search returns paginated result",
    phoneSearch.pagination.records >= 0,
  );
  // 11. Verify response structure contains all required fields
  if (johnSearch.data.length > 0) {
    const firstAddress = johnSearch.data[0];
    TestValidator.predicate(
      "address has id",
      typeof firstAddress.id === "string" && firstAddress.id.length > 0,
    );
    TestValidator.predicate(
      "address has recipient_name",
      typeof firstAddress.recipient_name === "string",
    );
    TestValidator.predicate(
      "address has phone_number",
      typeof firstAddress.phone_number === "string",
    );
    TestValidator.predicate(
      "address has street_address",
      typeof firstAddress.street_address === "string",
    );
    TestValidator.predicate(
      "address has city",
      typeof firstAddress.city === "string",
    );
    TestValidator.predicate(
      "address has state_province",
      typeof firstAddress.state_province === "string",
    );
    TestValidator.predicate(
      "address has postal_code",
      typeof firstAddress.postal_code === "string",
    );
    TestValidator.predicate(
      "address has country",
      typeof firstAddress.country === "string",
    );
    TestValidator.predicate(
      "address has is_default",
      typeof firstAddress.is_default === "boolean",
    );
    TestValidator.predicate(
      "address has customer",
      firstAddress.customer !== null && firstAddress.customer !== undefined,
    );
    TestValidator.predicate(
      "address has created_at",
      typeof firstAddress.created_at === "string",
    );
    TestValidator.predicate(
      "customer has id",
      typeof firstAddress.customer.id === "string",
    );
    TestValidator.predicate(
      "customer has email",
      typeof firstAddress.customer.email === "string",
    );
  }
}
