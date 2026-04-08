import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomer";
import type { IMallPlatformCustomerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomerSession";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_customer_session_retrieve_own_active_session(
  connection: api.IConnection,
): Promise<void> {
  const customerConnection: api.IConnection = { host: connection.host };
  const joined = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: "https://example.com/register",
      referrer: "https://example.com/landing",
      ip: "127.0.0.1",
    } satisfies IMallPlatformCustomer.IJoin,
  });
  typia.assert(joined);
  const sessionId: string & tags.Format<"uuid"> = joined.id;
  const session = await api.functional.mallPlatform.customer.sessions.at(
    customerConnection,
    {
      sessionId,
    },
  );
  typia.assert(session);
  TestValidator.equals(
    "session id should match requested id",
    session.id,
    sessionId,
  );
  TestValidator.equals(
    "session customer id should match authenticated customer",
    session.customer.id,
    joined.id,
  );
  TestValidator.equals(
    "session customer email should match authenticated customer",
    session.customer.email,
    joined.email,
  );
  TestValidator.equals(
    "session customer status should remain active",
    session.customer.status,
    "active",
  );
  TestValidator.equals(
    "session href should be preserved",
    session.href,
    "https://example.com/register",
  );
  TestValidator.equals(
    "session referrer should be preserved",
    session.referrer,
    "https://example.com/landing",
  );
  TestValidator.equals(
    "session ip should be preserved",
    session.ip,
    "127.0.0.1",
  );
  TestValidator.predicate(
    "session created_at should be a non-empty timestamp",
    session.created_at.length > 0,
  );
  TestValidator.predicate(
    "session expired_at should be a non-empty timestamp",
    session.expired_at.length > 0,
  );
}
