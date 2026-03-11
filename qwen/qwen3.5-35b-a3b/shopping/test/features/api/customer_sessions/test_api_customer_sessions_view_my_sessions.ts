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

/**
 * Test customer sessions viewing workflow.
 *
 * This test verifies that customers can view their own sessions across
 * multiple devices/browsers with proper access control and pagination.
 */
export async function test_api_customer_sessions_view_my_sessions(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register customer with specific password for repeated login
  const joinPassword = RandomGenerator.alphaNumeric(16);
  const joinConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(joinConnection, {
    body: {
      email: typia.assert<string & tags.MinLength<1> & tags.MaxLength<255> & tags.Format<"email">>(typia.random<string & tags.Format<"email">>()),
      password: joinPassword,
      href: typia.assert<string & tags.Format<"uri">>(typia.random<string & tags.Format<"uri">>()),
      referrer: typia.assert<string & tags.Format<"uri">>(typia.random<string & tags.Format<"uri">>()),
    } satisfies IEcommerceMallCustomer.IJoin,
  });
  typia.assert(customer);
  // 2. Create multiple sessions by logging in from different connections (simulate different devices)
  const sessionConnections: api.IConnection[] = [];
  const sessionCount = 3;
  for (let i = 0; i < sessionCount; i++) {
    const loginConnection: api.IConnection = { host: connection.host };
    await authorize_customer_login(loginConnection, {
      body: {
        email: customer.email,
        password: joinPassword,
        href: typia.assert<string & tags.Format<"uri">>(typia.random<string & tags.Format<"uri">>()),
        referrer: typia.assert<string & tags.Format<"uri">>(typia.random<string & tags.Format<"uri">>()),
      } satisfies IEcommerceMallCustomer.ILogin,
    });
    sessionConnections.push(loginConnection);
  }
  // 3. View sessions from one of the active connections
  const sessionsConnection: api.IConnection = sessionConnections[0];
  const sessionsResponse =
    await api.functional.ecommerceMall.customer.sessions.index(
      sessionsConnection,
      {
        body: {},
      },
    );
  typia.assert(sessionsResponse);
  // 4. Validate access control - only customer's own sessions returned
  TestValidator.equals(
    "session count matches",
    sessionsResponse.pagination.records,
    sessionCount,
  );
  TestValidator.equals(
    "session data length matches",
    sessionsResponse.data.length,
    sessionCount,
  );
  // 5. Validate pagination metadata
  TestValidator.predicate(
    "pagination metadata valid",
    () =>
      sessionsResponse.pagination.current >= 1 &&
      sessionsResponse.pagination.limit >= 1 &&
      sessionsResponse.pagination.records >= sessionCount &&
      sessionsResponse.pagination.pages >= 1,
  );
  // 6. Validate sessions sorted by created_at descending
  for (let i = 1; i < sessionsResponse.data.length; i++) {
    const prevDate = new Date(sessionsResponse.data[i - 1].created_at);
    const currDate = new Date(sessionsResponse.data[i].created_at);
    TestValidator.predicate(
      `session ${i} created before session ${i - 1}`,
      () => currDate <= prevDate,
    );
  }
  // 7. Validate session status computed correctly from expired_at
  const now = new Date();
  for (const session of sessionsResponse.data) {
    const expiredDate = new Date(session.expired_at);
    const expectedStatus = expiredDate > now ? "active" : "invalidated";
    TestValidator.equals(
      `session ${session.id} status`,
      session.sessionStatus,
      expectedStatus,
    );
  }
  // 8. Validate all required fields present in session records
  for (const session of sessionsResponse.data) {
    TestValidator.predicate("session has valid UUID id", () =>
      /^[0-9a-f-]{36}$/i.test(session.id),
    );
    TestValidator.predicate(
      "session has valid created_at timestamp",
      () => !isNaN(new Date(session.created_at).getTime()),
    );
    TestValidator.predicate(
      "session has valid expired_at timestamp",
      () => !isNaN(new Date(session.expired_at).getTime()),
    );
    TestValidator.predicate(
      "session has href field",
      () => session.href.length > 0,
    );
    TestValidator.predicate(
      "session has valid sessionStatus",
      () =>
        session.sessionStatus === "active" ||
        session.sessionStatus === "invalidated",
    );
  }
}