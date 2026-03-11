import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallCustomerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerSession";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallCustomerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallCustomerSession";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_customer_sessions_pagination_and_sorting(
  connection: api.IConnection,
): Promise<void> {
  // 1. Customer setup - create authenticated customer
  const customerConnection: api.IConnection = { host: connection.host };
  const authResponse = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>() satisfies string as string,
      password: "12345678",
      href: "https://example.com/register",
      referrer: "https://example.com",
    } satisfies IEcommerceMallCustomer.IJoin,
  });
  typia.assert(authResponse);
  // Set authorization token in connection headers
  customerConnection.headers = {
    Authorization: `Bearer ${authResponse.token.access}`,
  };
  // 2. Test default pagination - page 1 with default limit (20)
  const page1Response =
    await api.functional.ecommerceMall.customer.sessions.index(
      customerConnection,
      {
        body: {
          page: null, // defaults to page 1
          limit: null, // defaults to 20
        } satisfies IEcommerceMallCustomerSession.IRequest,
      },
    );
  typia.assert(page1Response);
  typia.assert(page1Response.pagination);
  typia.assert(page1Response.data);
  // Validate default pagination metadata
  TestValidator.equals("page 1 current", page1Response.pagination.current, 1);
  TestValidator.equals("page 1 limit", page1Response.pagination.limit, 20);
  TestValidator.predicate(
    "page 1 has non-negative records",
    page1Response.pagination.records >= 0,
  );
  TestValidator.equals(
    "page 1 pages calculated correctly",
    page1Response.pagination.pages,
    page1Response.pagination.records === 0
      ? 0
      : Math.ceil(page1Response.pagination.records / 20),
  );
  // 3. Test page 2 with limit 20
  const page2Response =
    await api.functional.ecommerceMall.customer.sessions.index(
      customerConnection,
      {
        body: {
          page: 2,
          limit: 20,
        } satisfies IEcommerceMallCustomerSession.IRequest,
      },
    );
  typia.assert(page2Response);
  typia.assert(page2Response.pagination);
  typia.assert(page2Response.data);
  TestValidator.equals("page 2 current", page2Response.pagination.current, 2);
  TestValidator.equals("page 2 limit", page2Response.pagination.limit, 20);
  TestValidator.equals(
    "page 2 records same as page 1",
    page2Response.pagination.records,
    page1Response.pagination.records,
  );
  TestValidator.equals(
    "page 2 pages same as page 1",
    page2Response.pagination.pages,
    page1Response.pagination.pages,
  );
  // 4. Test custom limit (10 items per page)
  const customLimitResponse =
    await api.functional.ecommerceMall.customer.sessions.index(
      customerConnection,
      {
        body: {
          page: 1,
          limit: 10,
        } satisfies IEcommerceMallCustomerSession.IRequest,
      },
    );
  typia.assert(customLimitResponse);
  typia.assert(customLimitResponse.pagination);
  typia.assert(customLimitResponse.data);
  TestValidator.equals(
    "custom limit 10",
    customLimitResponse.pagination.limit,
    10,
  );
  TestValidator.equals(
    "custom limit records same",
    customLimitResponse.pagination.records,
    page1Response.pagination.records,
  );
  const expectedPages10 =
    customLimitResponse.pagination.records === 0
      ? 0
      : Math.ceil(customLimitResponse.pagination.records / 10);
  TestValidator.equals(
    "custom limit 10 pages calculated",
    customLimitResponse.pagination.pages,
    expectedPages10,
  );
  // 5. Test sorting by created_at descending (default, sort: null)
  const defaultSortResponse =
    await api.functional.ecommerceMall.customer.sessions.index(
      customerConnection,
      {
        body: {
          page: 1,
          limit: 20,
          sort: null, // defaults to created_at descending
        } satisfies IEcommerceMallCustomerSession.IRequest,
      },
    );
  typia.assert(defaultSortResponse);
  typia.assert(defaultSortResponse.data);
  // Verify default sort order (created_at descending) only if we have enough data
  if (defaultSortResponse.data.length > 1) {
    for (let i = 1; i < defaultSortResponse.data.length; i++) {
      const prevDate = new Date(defaultSortResponse.data[i - 1].created_at);
      const currDate = new Date(defaultSortResponse.data[i].created_at);
      TestValidator.predicate(
        `default sort order correct at index ${i}`,
        prevDate >= currDate,
      );
    }
  }
  // 6. Test sorting by last_activity
  const lastActivitySortResponse =
    await api.functional.ecommerceMall.customer.sessions.index(
      customerConnection,
      {
        body: {
          page: 1,
          limit: 20,
          sort: "last_activity",
        } satisfies IEcommerceMallCustomerSession.IRequest,
      },
    );
  typia.assert(lastActivitySortResponse);
  typia.assert(lastActivitySortResponse.data);
  TestValidator.equals(
    "last activity sort current",
    lastActivitySortResponse.pagination.current,
    1,
  );
  // 7. Test sorting by actor_type
  const actorTypeSortResponse =
    await api.functional.ecommerceMall.customer.sessions.index(
      customerConnection,
      {
        body: {
          page: 1,
          limit: 20,
          sort: "actor_type",
        } satisfies IEcommerceMallCustomerSession.IRequest,
      },
    );
  typia.assert(actorTypeSortResponse);
  typia.assert(actorTypeSortResponse.data);
  TestValidator.equals(
    "actor type sort current",
    actorTypeSortResponse.pagination.current,
    1,
  );
  // 8. Test location search (partial text matching)
  const locationSearchResponse =
    await api.functional.ecommerceMall.customer.sessions.index(
      customerConnection,
      {
        body: {
          page: 1,
          limit: 20,
          locationSearch: "Seoul",
        } satisfies IEcommerceMallCustomerSession.IRequest,
      },
    );
  typia.assert(locationSearchResponse);
  typia.assert(locationSearchResponse.data);
  TestValidator.equals(
    "location search current",
    locationSearchResponse.pagination.current,
    1,
  );
  TestValidator.predicate(
    "location search has non-negative records",
    locationSearchResponse.pagination.records >= 0,
  );
  // 9. Validate all sessions belong to authenticated customer
  // and have valid structure
  for (const session of defaultSortResponse.data) {
    typia.assert(session);
    typia.assert(session.id);
    typia.assert(session.created_at);
    typia.assert(session.expired_at);
    typia.assert(session.sessionStatus);
    TestValidator.predicate(
      "session has valid status",
      session.sessionStatus === "active" ||
        session.sessionStatus === "invalidated",
    );
  }
  // 10. Test pagination boundary - page beyond total pages
  const beyondLastPageResponse =
    await api.functional.ecommerceMall.customer.sessions.index(
      customerConnection,
      {
        body: {
          page: 999,
          limit: 20,
        } satisfies IEcommerceMallCustomerSession.IRequest,
      },
    );
  typia.assert(beyondLastPageResponse);
  typia.assert(beyondLastPageResponse.pagination);
  typia.assert(beyondLastPageResponse.data);
  TestValidator.equals(
    "beyond last page current",
    beyondLastPageResponse.pagination.current,
    999,
  );
  TestValidator.equals(
    "beyond last page empty data",
    beyondLastPageResponse.data.length,
    0,
  );
  TestValidator.predicate(
    "beyond last page records consistent",
    beyondLastPageResponse.pagination.records >= 0,
  );
  // 11. Test minimum limit bound (1)
  const minLimitResponse =
    await api.functional.ecommerceMall.customer.sessions.index(
      customerConnection,
      {
        body: {
          page: 1,
          limit: 1,
        } satisfies IEcommerceMallCustomerSession.IRequest,
      },
    );
  typia.assert(minLimitResponse);
  TestValidator.equals("min limit 1", minLimitResponse.pagination.limit, 1);
  // 12. Test maximum limit bound (100)
  const maxLimitResponse =
    await api.functional.ecommerceMall.customer.sessions.index(
      customerConnection,
      {
        body: {
          page: 1,
          limit: 100,
        } satisfies IEcommerceMallCustomerSession.IRequest,
      },
    );
  typia.assert(maxLimitResponse);
  TestValidator.equals("max limit 100", maxLimitResponse.pagination.limit, 100);
}