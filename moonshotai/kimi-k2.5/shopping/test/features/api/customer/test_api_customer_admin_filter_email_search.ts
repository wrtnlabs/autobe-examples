import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallCustomer";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_customer_admin_filter_email_search(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate admin
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<
        string & tags.Format<"url">
      >() satisfies string as string,
      referrer: typia.random<
        string & tags.Format<"url">
      >() satisfies string as string,
    } satisfies IEcommerceMallAdmin.IJoin,
  });
  // 2. Create customers with predictable email patterns for search testing
  const baseId = RandomGenerator.alphaNumeric(8);
  const customerEmails = [
    `john.doe.${baseId}@test.com`,
    `jane.doe.${baseId}@test.com`,
    `john.smith.${baseId}@example.com`,
    `alice.${baseId}@wonderland.org`,
  ];
  for (const email of customerEmails) {
    const customerConn: api.IConnection = { host: connection.host };
    await authorize_customer_join(customerConn, {
      body: {
        email: email as string & tags.Format<"email">,
        password: RandomGenerator.alphaNumeric(16),
      } satisfies IEcommerceMallCustomer.IJoin,
    });
  }
  // 3. Test partial email search matching multiple customers ("doe")
  const searchDoe = await api.functional.ecommerceMall.customers.index(
    adminConnection,
    {
      body: {
        search: `doe.${baseId}`,
        limit: 10,
      } satisfies IEcommerceMallCustomer.IRequest,
    },
  );
  typia.assert(searchDoe);
  TestValidator.equals(
    "search 'doe' returns 2 records",
    searchDoe.pagination.records,
    2,
  );
  TestValidator.predicate("search 'doe' results contain doe emails", () =>
    searchDoe.data.every((c) => c.email.toLowerCase().includes("doe")),
  );
  // 4. Test partial email search matching different subset ("john")
  const searchJohn = await api.functional.ecommerceMall.customers.index(
    adminConnection,
    {
      body: {
        search: `john`,
        limit: 10,
      } satisfies IEcommerceMallCustomer.IRequest,
    },
  );
  typia.assert(searchJohn);
  TestValidator.equals(
    "search 'john' returns 2 records",
    searchJohn.pagination.records,
    2,
  );
  TestValidator.predicate("search 'john' results contain john emails", () =>
    searchJohn.data.every((c) => c.email.toLowerCase().includes("john")),
  );
  // 5. Test case-insensitive search
  const searchUppercase = await api.functional.ecommerceMall.customers.index(
    adminConnection,
    {
      body: {
        search: `DOE.${baseId}`.toUpperCase(),
        limit: 10,
      } satisfies IEcommerceMallCustomer.IRequest,
    },
  );
  typia.assert(searchUppercase);
  TestValidator.equals(
    "uppercase search returns same count",
    searchUppercase.pagination.records,
    2,
  );
  TestValidator.predicate("uppercase search results match", () =>
    searchUppercase.data.every((c) => c.email.toLowerCase().includes("doe")),
  );
  // 6. Test no matching results
  const searchNone = await api.functional.ecommerceMall.customers.index(
    adminConnection,
    {
      body: {
        search: `nonexistentxyz${baseId}`,
        limit: 10,
      } satisfies IEcommerceMallCustomer.IRequest,
    },
  );
  typia.assert(searchNone);
  TestValidator.equals(
    "nonexistent search returns 0 records",
    searchNone.pagination.records,
    0,
  );
  TestValidator.equals(
    "nonexistent search returns empty data",
    searchNone.data.length,
    0,
  );
  TestValidator.equals(
    "nonexistent search shows 0 pages",
    searchNone.pagination.pages,
    0,
  );
  // 7. Test combined with sorting by email ascending
  const searchSorted = await api.functional.ecommerceMall.customers.index(
    adminConnection,
    {
      body: {
        search: `doe.${baseId}`,
        sort: "email",
        order: "asc",
        limit: 10,
      } satisfies IEcommerceMallCustomer.IRequest,
    },
  );
  typia.assert(searchSorted);
  TestValidator.equals(
    "sorted search returns 2 records",
    searchSorted.pagination.records,
    2,
  );
  // Verify alphabetical order
  const emails = searchSorted.data.map((c) => c.email);
  const sortedEmails = [...emails].sort((a, b) => a.localeCompare(b));
  TestValidator.equals(
    "results sorted alphabetically by email ascending",
    emails,
    sortedEmails,
  );
}
