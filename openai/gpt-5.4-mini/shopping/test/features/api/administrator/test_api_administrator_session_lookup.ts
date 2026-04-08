import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformAdministrator";
import type { IMallPlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomer";
import type { IMallPlatformCustomerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomerSession";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

/**
 * Lookup a customer session as an authenticated administrator.
 *
 * Verifies that an administrator can access the session detail endpoint and that
 * the returned session record contains the expected audit fields. The test uses
 * an administrator-authenticated connection, queries a specific session UUID,
 * and validates the returned payload shape for the session owner summary and
 * audit metadata.
 *
 * 1. Create and authenticate a new administrator account.
 * 2. Request a session record by UUID through the administrator session lookup endpoint.
 * 3. Validate the returned session payload fields and confirm the requested identifier is preserved.
 */
export async function test_api_administrator_session_lookup(
  connection: api.IConnection,
): Promise<void> {
  const administratorConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(administratorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    } satisfies IMallPlatformAdministrator.IJoin,
  });
  const sessionId = typia.random<string & tags.Format<"uuid">>();
  const session = await api.functional.mallPlatform.administrator.sessions.at(
    administratorConnection,
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
  typia.assert(session.customer);
  TestValidator.predicate(
    "session ip should be non-empty",
    session.ip.length > 0,
  );
  TestValidator.predicate(
    "session href should be non-empty",
    session.href.length > 0,
  );
  TestValidator.predicate(
    "session referrer should be non-empty",
    session.referrer.length > 0,
  );
  TestValidator.predicate(
    "session created_at should be non-empty",
    session.created_at.length > 0,
  );
  TestValidator.predicate(
    "session expired_at should be non-empty",
    session.expired_at.length > 0,
  );
}
