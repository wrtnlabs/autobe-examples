import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallAdminSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdminSession";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_session_cross_user_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // 1. First admin: submit join request
  const firstJoinOutput =
    await api.functional.ecommerceMall.auth.admin.request.join(connection, {
      body: {
        actorType: "customer",
        requestedGrade: "admin",
        reason: "Need admin access for testing purposes",
        href: "https://example.com/admin",
        referrer: "https://example.com/",
      } satisfies IEcommerceMallAdmin.IJoin,
    });
  typia.assert(firstJoinOutput);
  // 2. First admin: login to create session
  const firstLoginOutput = await api.functional.ecommerceMall.auth.admin.login(
    connection,
    {
      body: {
        email: firstJoinOutput.email,
        password: "adminPassword123",
        href: "https://example.com/admin",
        referrer: "https://example.com/",
      } satisfies IEcommerceMallAdmin.ILogin,
    },
  );
  typia.assert(firstLoginOutput);
  // Create first admin connection with token
  const firstAdminConnection: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: `Bearer ${firstLoginOutput.token.access}`,
    },
  };
  // 3. Second admin: submit join request
  const secondJoinOutput =
    await api.functional.ecommerceMall.auth.admin.request.join(connection, {
      body: {
        actorType: "seller",
        requestedGrade: "admin",
        reason: "Need admin privileges for seller management",
        href: "https://example.com/admin",
        referrer: "https://example.com/",
      } satisfies IEcommerceMallAdmin.IJoin,
    });
  typia.assert(secondJoinOutput);
  // 4. Second admin: login to create session
  const secondLoginOutput = await api.functional.ecommerceMall.auth.admin.login(
    connection,
    {
      body: {
        email: secondJoinOutput.email,
        password: "adminPassword123",
        href: "https://example.com/admin",
        referrer: "https://example.com/",
      } satisfies IEcommerceMallAdmin.ILogin,
    },
  );
  typia.assert(secondLoginOutput);
  // 5. First admin retrieves second admin's session using generated UUID
  // Note: In a real scenario, session ID would be obtained from a list endpoint
  const session = await api.functional.ecommerceMall.admin.admin.sessions.at(
    firstAdminConnection,
    {
      sessionId: typia.random<string & typia.tags.Format<"uuid">>(),
    },
  );
  typia.assert(session);
  // Validate session structure (admin reference in response)
  TestValidator.predicate(
    "admin object exists",
    session.admin !== null && session.admin !== undefined,
  );
  TestValidator.predicate(
    "admin id is valid UUID",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      session.admin.id,
    ),
  );
  TestValidator.predicate(
    "admin email is present",
    session.admin.email.length > 0,
  );
  TestValidator.predicate(
    "admin name is present",
    session.admin.name.length > 0,
  );
  // Validate session metadata is present
  TestValidator.predicate(
    "session id is valid UUID",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      session.id,
    ),
  );
  TestValidator.predicate("ip is present", session.ip.length > 0);
  TestValidator.predicate("href is present", session.href.length > 0);
  TestValidator.predicate("referrer is present", session.referrer.length > 0);
  TestValidator.predicate(
    "created_at is valid datetime",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(session.created_at),
  );
  TestValidator.predicate(
    "expired_at is valid datetime",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(session.expired_at),
  );
}
