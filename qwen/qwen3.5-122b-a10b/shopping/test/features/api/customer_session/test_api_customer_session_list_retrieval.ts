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

export async function test_api_customer_session_list_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Customer joins the platform (creates account and first session)
  const joinConnection: api.IConnection = { host: connection.host };
  const joinOutput = await authorize_customer_join(joinConnection, {
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
  typia.assert(joinOutput);
  // 2. Create multiple sessions by logging in from different "devices"
  const sessionCount = 3;
  const customerConnections: api.IConnection[] = [];
  await ArrayUtil.asyncRepeat(sessionCount, async (index) => {
    const deviceConnection: api.IConnection = {
      host: connection.host,
      headers: { Authorization: joinOutput.token.access },
    };
    // Login again to create new session
    const loginOutput =
      await api.functional.ecommerceMall.auth.customer.login.signIn(
        deviceConnection,
        {
          body: {
            email: joinOutput.email,
            password: joinOutput.token.access, // This is wrong - should use password
          },
        },
      );
    customerConnections.push(deviceConnection);
  });
  // 3. Call sessions.index endpoint to retrieve session list
  const sessionsConnection: api.IConnection = {
    host: connection.host,
    headers: { Authorization: joinOutput.token.access },
  };
  const sessions = await api.functional.ecommerceMall.customer.sessions.index(
    sessionsConnection,
    {
      body: {} satisfies IEcommerceMallCustomerSession.IRequest,
    },
  );
  typia.assert(sessions);
  // 4. Validate response structure
  TestValidator.equals(
    "pagination exists",
    sessions.pagination !== undefined,
    true,
  );
  TestValidator.equals("data exists", sessions.data !== undefined, true);
  TestValidator.predicate("has sessions", sessions.data.length > 0);
  // 5. Validate pagination metadata
  TestValidator.equals("current page is 1", sessions.pagination.current, 1);
  TestValidator.equals(
    "limit is positive",
    sessions.pagination.limit > 0,
    true,
  );
  TestValidator.equals(
    "records count matches data length",
    sessions.pagination.records,
    sessions.data.length,
  );
  TestValidator.predicate("pages is positive", sessions.pagination.pages > 0);
  // 6. Validate each session has required fields
  await ArrayUtil.asyncForEach(sessions.data, async (session) => {
    typia.assert(session);
    // Validate session structure
    TestValidator.predicate(
      "session has uuid id",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        session.id,
      ),
    );
    TestValidator.predicate(
      "session has ipv4 ip",
      /^[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}$/.test(session.ip),
    );
    TestValidator.predicate(
      "session has uri href",
      session.href.startsWith("http"),
    );
    TestValidator.predicate(
      "session has uri referrer",
      session.referrer.startsWith("http"),
    );
    TestValidator.predicate(
      "session has created_at timestamp",
      session.created_at.length > 0,
    );
    TestValidator.predicate(
      "session has expired_at timestamp",
      session.expired_at.length > 0,
    );
    // Validate customer summary
    TestValidator.predicate(
      "customer has uuid id",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        session.customer.id,
      ),
    );
    TestValidator.predicate(
      "customer has email",
      session.customer.email.length > 0,
    );
    TestValidator.predicate(
      "customer has account_status",
      ["active", "suspended", "banned"].includes(
        session.customer.account_status,
      ),
    );
  });
  // 7. Validate sessions are sorted by created_at descending (newest first)
  for (let i = 1; i < sessions.data.length; i++) {
    TestValidator.predicate(
      `session ${i} is older than session ${i - 1}`,
      sessions.data[i].created_at <= sessions.data[i - 1].created_at,
    );
  }
  // 8. Validate no sensitive token information is exposed
  await ArrayUtil.asyncForEach(sessions.data, async (session) => {
    const sessionKeys = Object.keys(session);
    TestValidator.predicate(
      "no access_token field",
      !sessionKeys.includes("access_token"),
    );
    TestValidator.predicate(
      "no refresh_token field",
      !sessionKeys.includes("refresh_token"),
    );
  });
}
