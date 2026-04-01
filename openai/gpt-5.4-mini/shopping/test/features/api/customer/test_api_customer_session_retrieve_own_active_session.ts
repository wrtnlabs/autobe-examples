import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformAdministratorSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformAdministratorSession";
import type { IMallPlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomer";
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
  const authorized = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IMallPlatformCustomer.IJoin,
  });
  typia.assert(authorized);
  const sessionId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const session = await api.functional.mallPlatform.customer.sessions.at(
    customerConnection,
    {
      sessionId,
    },
  );
  typia.assert(session);
  TestValidator.equals(
    "session id should match request",
    session.id,
    sessionId,
  );
  TestValidator.predicate(
    "owner id should exist",
    session.administratorId.length > 0,
  );
  TestValidator.predicate(
    "session ip should be present",
    session.ip.length > 0,
  );
  TestValidator.predicate(
    "session href should be present",
    session.href.length > 0,
  );
  TestValidator.predicate(
    "session referrer should be present",
    session.referrer.length >= 0,
  );
  TestValidator.predicate(
    "session createdAt should be present",
    session.createdAt.length > 0,
  );
  TestValidator.predicate(
    "session expiredAt should be present",
    session.expiredAt.length > 0,
  );
}
