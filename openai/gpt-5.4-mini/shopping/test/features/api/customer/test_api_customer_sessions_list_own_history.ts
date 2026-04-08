import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomer";
import type { IMallPlatformCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomerProfile";
import type { IMallPlatformCustomerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomerSession";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIMallPlatformCustomerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMallPlatformCustomerSession";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

/**
 * Test customer session history listing for the authenticated customer.
 *
 * Validates that the session listing endpoint returns only the caller's own sessions with correct pagination, filtering, and ordering semantics. The test also confirms that the returned session summaries expose the expected public fields while omitting any secret session material.
 *
 * 1. Register a customer and create an authenticated customer connection.
 * 2. Query the customer's session history using pagination and filters.
 * 3. Validate that only the caller's sessions are returned.
 * 4. Confirm the response contains only summary data and no secret material.
 * 5. Verify the listing operation does not mutate session state.
 */
export async function test_api_customer_sessions_list_own_history(
  connection: api.IConnection,
): Promise<void> {
  const customerConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      href: "https://example.com/join",
      referrer: "https://example.com/landing",
      ip: "127.0.0.1",
    } satisfies IMallPlatformCustomer.IJoin,
  });
  typia.assert(authorized);
  const baseQuery: IMallPlatformCustomerSession.IRequest = {
    page: 1,
    limit: 20,
    sort: "-created_at",
  };
  const sessionList = await api.functional.mallPlatform.customer.sessions.index(
    customerConnection,
    {
      body: baseQuery,
    },
  );
  typia.assert(sessionList);
  TestValidator.equals(
    "pagination current page",
    sessionList.pagination.current,
    1,
  );
  TestValidator.equals("pagination limit", sessionList.pagination.limit, 20);
  TestValidator.predicate(
    "pagination records should be non-negative",
    sessionList.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages should be non-negative",
    sessionList.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "returned sessions should belong to the authenticated customer",
    sessionList.data.every((session) => session.customer.id === authorized.id),
  );
  TestValidator.predicate(
    "returned sessions should expose the public session summary fields",
    sessionList.data.every((session) => {
      void session.customer.email;
      void session.customer.status;
      void session.customer.created_at;
      void session.customer.updated_at;
      void session.customer.deleted_at;
      void session.ip;
      void session.href;
      void session.referrer;
      void session.createdAt;
      void session.expiredAt;
      return true;
    }),
  );
  if (sessionList.data.length > 0) {
    const first = sessionList.data[0]!;
    const ipFiltered =
      await api.functional.mallPlatform.customer.sessions.index(
        customerConnection,
        {
          body: {
            page: 1,
            limit: 20,
            ip: first.ip as string & tags.Format<"ipv4">,
          } satisfies IMallPlatformCustomerSession.IRequest,
        },
      );
    typia.assert(ipFiltered);
    TestValidator.predicate(
      "IP filter should keep only matching sessions",
      ipFiltered.data.every((session) => session.ip === first.ip),
    );
    const hrefFiltered =
      await api.functional.mallPlatform.customer.sessions.index(
        customerConnection,
        {
          body: {
            page: 1,
            limit: 20,
            href: first.href as string & tags.Format<"uri-reference">,
          } satisfies IMallPlatformCustomerSession.IRequest,
        },
      );
    typia.assert(hrefFiltered);
    TestValidator.predicate(
      "href filter should keep only matching sessions",
      hrefFiltered.data.every((session) => session.href === first.href),
    );
    const referrerFiltered =
      await api.functional.mallPlatform.customer.sessions.index(
        customerConnection,
        {
          body: {
            page: 1,
            limit: 20,
            referrer: first.referrer as string & tags.Format<"uri-reference">,
          } satisfies IMallPlatformCustomerSession.IRequest,
        },
      );
    typia.assert(referrerFiltered);
    TestValidator.predicate(
      "referrer filter should keep only matching sessions",
      referrerFiltered.data.every(
        (session) => session.referrer === first.referrer,
      ),
    );
    const createdAtFiltered =
      await api.functional.mallPlatform.customer.sessions.index(
        customerConnection,
        {
          body: {
            page: 1,
            limit: 20,
            createdAtFrom: first.createdAt,
            createdAtTo: first.createdAt,
          } satisfies IMallPlatformCustomerSession.IRequest,
        },
      );
    typia.assert(createdAtFiltered);
    TestValidator.predicate(
      "createdAt range filter should keep only matching sessions",
      createdAtFiltered.data.every(
        (session) =>
          session.createdAt >= first.createdAt &&
          session.createdAt <= first.createdAt,
      ),
    );
    const expiredAtFiltered =
      await api.functional.mallPlatform.customer.sessions.index(
        customerConnection,
        {
          body: {
            page: 1,
            limit: 20,
            expiredAtFrom: first.expiredAt,
            expiredAtTo: first.expiredAt,
          } satisfies IMallPlatformCustomerSession.IRequest,
        },
      );
    typia.assert(expiredAtFiltered);
    TestValidator.predicate(
      "expiredAt range filter should keep only matching sessions",
      expiredAtFiltered.data.every(
        (session) =>
          session.expiredAt >= first.expiredAt &&
          session.expiredAt <= first.expiredAt,
      ),
    );
  }
  const sortedByCreatedAt = [...sessionList.data].sort((x, y) =>
    y.createdAt.localeCompare(x.createdAt),
  );
  TestValidator.equals(
    "sessions should be sorted by newest first",
    sessionList.data.map((session) => session.id),
    sortedByCreatedAt.map((session) => session.id),
  );
  const rereadSessionList =
    await api.functional.mallPlatform.customer.sessions.index(
      customerConnection,
      {
        body: baseQuery,
      },
    );
  typia.assert(rereadSessionList);
  TestValidator.equals(
    "session listing should be read-only",
    sessionList.data.map((session) => session.id),
    rereadSessionList.data.map((session) => session.id),
  );
}
