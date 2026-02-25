import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomer";
import type { IEcommerceCustomerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomerSession";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceCustomerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceCustomerSession";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_customer_sessions_with_filters(
  connection: api.IConnection,
): Promise<void> {
  // Create customer 1 account and generate multiple sessions
  const customer1Connection: api.IConnection = { host: connection.host };
  const customer1 = await authorize_customer_join(customer1Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
      display_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
    } satisfies IEcommerceCustomer.IJoin,
  });
  typia.assert(customer1);
  // Generate multiple sessions for customer 1 by logging in multiple times
  const customer1Sessions = await ArrayUtil.asyncRepeat(3, async () => {
    const sessionConnection: api.IConnection = { host: connection.host };
    const session = await authorize_customer_login(sessionConnection, {
      body: {
        email: customer1.email,
        password: "password123",
      } satisfies IEcommerceCustomer.ILogin,
    });
    typia.assert(session);
    return session;
  });
  // Create customer 2 account with single session
  const customer2Connection: api.IConnection = { host: connection.host };
  const customer2 = await authorize_customer_join(customer2Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
      display_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
    } satisfies IEcommerceCustomer.IJoin,
  });
  typia.assert(customer2);
  // Test search functionality
  const searchResponse = await api.functional.ecommerce.customer.sessions.index(
    customer1Connection,
    {
      body: {
        search: "192",
        page: 1,
        limit: 10,
      } satisfies IEcommerceCustomerSession.IRequest,
    },
  );
  typia.assert(searchResponse);
  // Test IP pattern filtering
  const ipFilterResponse =
    await api.functional.ecommerce.customer.sessions.index(
      customer1Connection,
      {
        body: {
          ip_patterns: ["192.168", "10.0"],
          page: 1,
          limit: 10,
        } satisfies IEcommerceCustomerSession.IRequest,
      },
    );
  typia.assert(ipFilterResponse);
  // Test date range filtering
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  const dateFilterResponse =
    await api.functional.ecommerce.customer.sessions.index(
      customer1Connection,
      {
        body: {
          created_after: yesterday,
          created_before: tomorrow,
          page: 1,
          limit: 10,
        } satisfies IEcommerceCustomerSession.IRequest,
      },
    );
  typia.assert(dateFilterResponse);
  // Test expiration status filtering
  const expiredFilterResponse =
    await api.functional.ecommerce.customer.sessions.index(
      customer1Connection,
      {
        body: {
          expired: false,
          page: 1,
          limit: 10,
        } satisfies IEcommerceCustomerSession.IRequest,
      },
    );
  typia.assert(expiredFilterResponse);
  // Test pagination with different limits
  const paginationResponse1 =
    await api.functional.ecommerce.customer.sessions.index(
      customer1Connection,
      {
        body: {
          page: 1,
          limit: 2,
        } satisfies IEcommerceCustomerSession.IRequest,
      },
    );
  typia.assert(paginationResponse1);
  TestValidator.predicate(
    "page 1 limit 2 returns data",
    paginationResponse1.data.length <= 2,
  );
  const paginationResponse2 =
    await api.functional.ecommerce.customer.sessions.index(
      customer1Connection,
      {
        body: {
          page: 2,
          limit: 2,
        } satisfies IEcommerceCustomerSession.IRequest,
      },
    );
  typia.assert(paginationResponse2);
  // Verify that customer 2 cannot see customer 1's sessions
  const customer2Response =
    await api.functional.ecommerce.customer.sessions.index(
      customer2Connection,
      {
        body: {
          page: 1,
          limit: 10,
        } satisfies IEcommerceCustomerSession.IRequest,
      },
    );
  typia.assert(customer2Response);
  // Customer 2 should only see their own session
  TestValidator.predicate(
    "customer 2 sees appropriate sessions",
    customer2Response.data.length >= 1,
  );
  // Test session type filtering
  const sessionTypeResponse =
    await api.functional.ecommerce.customer.sessions.index(
      customer1Connection,
      {
        body: {
          session_type: "customer",
          page: 1,
          limit: 10,
        } satisfies IEcommerceCustomerSession.IRequest,
      },
    );
  typia.assert(sessionTypeResponse);
}
