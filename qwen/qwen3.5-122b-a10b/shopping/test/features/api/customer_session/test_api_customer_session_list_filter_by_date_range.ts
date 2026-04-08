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

/**
 * Test customer session list filtering by date range.
 *
 * Validates that customers can filter their login session history by creation date range using the created_at filter with gte and lte operators. This ensures proper timestamp comparison logic for security auditing workflows and allows customers to review activity during specific periods.
 *
 * The test creates multiple sessions through repeated logins, then verifies that filtering returns only sessions within the specified date range. It validates both individual filter operators (gte alone, lte alone) and combined filtering (both gte and lte).
 *
 * 1. Register a new customer account with random credentials.
 * 2. Create multiple login sessions by logging in at different times.
 * 3. Filter sessions using created_at filter with gte and lte operators.
 * 4. Validate returned sessions fall within the specified date range.
 * 5. Test filtering with only gte operator (sessions after a date).
 * 6. Test filtering with only lte operator (sessions before a date).
 * 7. Test filtering with both operators (sessions within range).
 * 8. Validate pagination metadata is accurate.
 */
export async function test_api_customer_session_list_filter_by_date_range(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register customer and store credentials
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customerPassword = RandomGenerator.alphaNumeric(16);
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {
    body: {
      email: customerEmail,
      password: customerPassword,
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceCustomer.IJoin,
  });
  typia.assert(customer);
  // 2. Create multiple sessions by logging in multiple times
  await ArrayUtil.asyncRepeat(3, async () => {
    const loginConnection: api.IConnection = { host: connection.host };
    await api.functional.ecommerce.auth.customer.login(loginConnection, {
      body: {
        email: customerEmail,
        password: customerPassword,
      },
    });
    // Small delay to ensure different timestamps
    await new Promise((resolve) => setTimeout(resolve, 100));
  });
  // 3. Get all sessions to establish baseline
  const allSessions = await api.functional.ecommerce.customer.sessions.index(
    customerConnection,
    {
      body: {
        page: 1,
        limit: 100,
      } satisfies IEcommerceCustomerSession.IRequest,
    },
  );
  typia.assert(allSessions);
  TestValidator.predicate("has sessions", allSessions.data.length > 0);
  // 4. Test filtering with gte only (sessions created after a date)
  const midDate = new Date();
  midDate.setHours(midDate.getHours() - 1);
  const filteredAfter = await api.functional.ecommerce.customer.sessions.index(
    customerConnection,
    {
      body: {
        page: 1,
        limit: 100,
        created_at: {
          gte: midDate.toISOString(),
        },
      } satisfies IEcommerceCustomerSession.IRequest,
    },
  );
  typia.assert(filteredAfter);
  // Validate all returned sessions are after the midDate
  TestValidator.predicate(
    "all sessions created after gte date",
    filteredAfter.data.every(
      (session) => new Date(session.created_at) >= midDate,
    ),
  );
  // 5. Test filtering with lte only (sessions created before a date)
  const futureDate = new Date();
  futureDate.setHours(futureDate.getHours() + 1);
  const filteredBefore = await api.functional.ecommerce.customer.sessions.index(
    customerConnection,
    {
      body: {
        page: 1,
        limit: 100,
        created_at: {
          lte: futureDate.toISOString(),
        },
      } satisfies IEcommerceCustomerSession.IRequest,
    },
  );
  typia.assert(filteredBefore);
  // Validate all returned sessions are before the futureDate
  TestValidator.predicate(
    "all sessions created before lte date",
    filteredBefore.data.every(
      (session) => new Date(session.created_at) <= futureDate,
    ),
  );
  // 6. Test filtering with both gte and lte (sessions within range)
  const rangeStart = new Date();
  rangeStart.setHours(rangeStart.getHours() - 2);
  const rangeEnd = new Date();
  rangeEnd.setHours(rangeEnd.getHours() + 1);
  const filteredRange = await api.functional.ecommerce.customer.sessions.index(
    customerConnection,
    {
      body: {
        page: 1,
        limit: 100,
        created_at: {
          gte: rangeStart.toISOString(),
          lte: rangeEnd.toISOString(),
        },
      } satisfies IEcommerceCustomerSession.IRequest,
    },
  );
  typia.assert(filteredRange);
  // Validate all returned sessions are within the range
  TestValidator.predicate(
    "all sessions within date range",
    filteredRange.data.every(
      (session) =>
        new Date(session.created_at) >= rangeStart &&
        new Date(session.created_at) <= rangeEnd,
    ),
  );
  // 7. Validate pagination metadata
  TestValidator.equals(
    "pagination current page",
    filteredRange.pagination.current,
    1,
  );
  TestValidator.predicate(
    "pagination limit positive",
    filteredRange.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination records non-negative",
    filteredRange.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages non-negative",
    filteredRange.pagination.pages >= 0,
  );
}
