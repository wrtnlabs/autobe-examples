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

export async function test_api_customer_sessions_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register customer
  const joinConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(joinConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallCustomer.IJoin,
  });
  typia.assert(customer);
  // 2. Create multiple sessions by logging in multiple times
  const sessionCount = 50;
  // Login multiple times to create multiple sessions
  for (let i = 0; i < sessionCount; i++) {
    const loginConnection: api.IConnection = { host: connection.host };
    await authorize_customer_login(loginConnection, {
      body: {
        email: customer.email,
        password: customer.token.access,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: "127.0.0.1",
      } satisfies IEcommerceMallCustomer.ILogin,
    });
  }
  // 3. Query sessions with page=1, limit=10
  const page1Connection: api.IConnection = { host: connection.host };
  const page1Result =
    await api.functional.ecommerceMall.customer.sessions.index(
      page1Connection,
      {
        body: {
          page: 1,
          limit: 10,
        } satisfies IEcommerceMallCustomerSession.IRequest,
      },
    );
  typia.assert(page1Result);
  // 4. Validate pagination metadata for page 1
  TestValidator.equals(
    "pagination current page is 1",
    page1Result.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit is 10",
    page1Result.pagination.limit,
    10,
  );
  TestValidator.equals(
    "pagination total records matches session count",
    page1Result.pagination.records,
    sessionCount,
  );
  TestValidator.equals(
    "pagination total pages calculated correctly",
    page1Result.pagination.pages,
    Math.ceil(sessionCount / 10),
  );
  TestValidator.equals(
    "page 1 returns 10 records",
    page1Result.data.length,
    10,
  );
  // 5. Test last page (page 5 with 50 records, limit 10)
  const lastPageConnection: api.IConnection = { host: connection.host };
  const lastPageResult =
    await api.functional.ecommerceMall.customer.sessions.index(
      lastPageConnection,
      {
        body: {
          page: 5,
          limit: 10,
        } satisfies IEcommerceMallCustomerSession.IRequest,
      },
    );
  typia.assert(lastPageResult);
  TestValidator.equals(
    "last page current is 5",
    lastPageResult.pagination.current,
    5,
  );
  TestValidator.equals(
    "last page has correct record count",
    lastPageResult.data.length,
    10,
  );
  // 6. Test page beyond total pages
  const beyondPageConnection: api.IConnection = { host: connection.host };
  const beyondPageResult =
    await api.functional.ecommerceMall.customer.sessions.index(
      beyondPageConnection,
      {
        body: {
          page: 10,
          limit: 10,
        } satisfies IEcommerceMallCustomerSession.IRequest,
      },
    );
  typia.assert(beyondPageResult);
  TestValidator.equals(
    "beyond last page returns empty data",
    beyondPageResult.data.length,
    0,
  );
  // 7. Validate ordering by created_at descending
  for (let i = 1; i < page1Result.data.length; i++) {
    const prevCreatedAt = new Date(
      page1Result.data[i - 1]!.created_at,
    ).getTime();
    const currCreatedAt = new Date(page1Result.data[i]!.created_at).getTime();
    TestValidator.predicate(
      `session at index ${i} is older than or equal to session at index ${i - 1}`,
      currCreatedAt <= prevCreatedAt,
    );
  }
  // 8. Validate summary data structure contains only summary fields
  const summary = page1Result.data[0]!;
  typia.assert(summary);
  // Verify all required summary fields exist
  TestValidator.equals("summary has uuid id", summary.id !== undefined, true);
  TestValidator.equals(
    "summary has ip address",
    summary.ip !== undefined,
    true,
  );
  TestValidator.equals("summary has href", summary.href !== undefined, true);
  TestValidator.equals(
    "summary has referrer",
    summary.referrer !== undefined,
    true,
  );
  TestValidator.equals(
    "summary has customer",
    summary.customer !== undefined,
    true,
  );
  TestValidator.equals(
    "summary has created_at",
    summary.created_at !== undefined,
    true,
  );
  TestValidator.equals(
    "summary has updated_at",
    summary.updated_at !== undefined,
    true,
  );
  TestValidator.equals(
    "summary has expired_at",
    summary.expired_at !== undefined,
    true,
  );
  TestValidator.equals(
    "summary has deleted_at",
    summary.deleted_at !== undefined,
    true,
  );
  // Verify customer summary has expected fields
  TestValidator.equals(
    "customer summary has id",
    summary.customer.id !== undefined,
    true,
  );
  TestValidator.equals(
    "customer summary has email",
    summary.customer.email !== undefined,
    true,
  );
  TestValidator.equals(
    "customer summary has status",
    summary.customer.status !== undefined,
    true,
  );
  TestValidator.equals(
    "customer summary has created_at",
    summary.customer.created_at !== undefined,
    true,
  );
  TestValidator.equals(
    "customer summary has deleted_at",
    summary.customer.deleted_at !== undefined,
    true,
  );
}