import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSuperAdmin";
import type { IEcommerceMallSuperAdminSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSuperAdminSession";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

export async function test_api_superadmin_session_retrieval_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new super administrator to get session
  const superAdminConnection: api.IConnection = { host: connection.host };
  const registered = await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16) as string &
        tags.Format<"password">,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(registered);
  // 2. Create authenticated connection with the token
  const authenticatedConnection: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: `Bearer ${registered.token.access}`,
    },
  };
  // Generate a valid UUID session ID for retrieval
  const sessionId = typia.random<string & tags.Format<"uuid">>();
  // 3. Retrieve session details
  const session = await api.functional.ecommerceMall.superAdmin.sessions.at(
    authenticatedConnection,
    {
      sessionId: sessionId,
    },
  );
  typia.assert(session);
  // 4. Validate session response structure
  TestValidator.equals(
    "session ID matches requested UUID",
    session.id,
    sessionId,
  );
  TestValidator.predicate(
    "IP address is valid IPv4 format",
    /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(session.ip),
  );
  TestValidator.equals("href is populated", session.href.length > 0, true);
  TestValidator.equals(
    "referrer is populated",
    session.referrer.length > 0,
    true,
  );
  TestValidator.predicate(
    "createdAt timestamp is valid",
    new Date(session.createdAt).getTime() > 0,
  );
  TestValidator.predicate(
    "expiredAt is in the future",
    new Date(session.expiredAt).getTime() > Date.now(),
  );
  // Validate superAdmin summary object
  TestValidator.equals(
    "superAdmin id exists",
    session.superAdmin.id.length > 0,
    true,
  );
  TestValidator.equals(
    "superAdmin email matches registered email",
    session.superAdmin.email,
    registered.email,
  );
  TestValidator.predicate(
    "superAdmin createdAt is valid",
    new Date(session.superAdmin.createdAt).getTime() > 0,
  );
  TestValidator.predicate(
    "superAdmin updatedAt is valid",
    new Date(session.superAdmin.updatedAt).getTime() > 0,
  );
}
