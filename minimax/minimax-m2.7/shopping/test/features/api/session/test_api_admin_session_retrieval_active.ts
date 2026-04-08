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

export async function test_api_admin_session_retrieval_active(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create admin account via admin request
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      actorType: RandomGenerator.pick(["customer", "seller"] as const),
      requestedGrade: RandomGenerator.pick(["admin", "super_admin"] as const),
      reason: RandomGenerator.paragraph({ sentences: 5 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallAdmin.IJoin,
  });
  // Step 2: Authenticate as admin to create session
  const authorized = await authorize_admin_login(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Password123!@#" satisfies string & tags.Format<"password">,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallAdmin.ILogin,
  });
  // Step 3: Retrieve the session using admin ID as session identifier
  const session = await api.functional.ecommerceMall.admin.admin.sessions.at(
    adminConnection,
    {
      sessionId: authorized.id,
    },
  );
  // Step 4: Validate session response
  typia.assert(session);
  // Validate session is still active
  const now = new Date();
  const expiredAt = new Date(session.expired_at);
  TestValidator.predicate(
    "session is still active (expired_at in future)",
    expiredAt > now,
  );
  // Validate admin reference matches authenticated admin
  TestValidator.equals(
    "admin id matches authenticated admin",
    session.admin.id,
    authorized.id,
  );
  TestValidator.equals(
    "admin email matches authenticated admin",
    session.admin.email,
    authorized.email,
  );
  TestValidator.equals(
    "admin name matches authenticated admin",
    session.admin.name,
    authorized.name,
  );
}
