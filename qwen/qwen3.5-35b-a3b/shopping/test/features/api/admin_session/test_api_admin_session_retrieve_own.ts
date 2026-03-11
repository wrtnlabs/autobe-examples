import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerSession";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_session_retrieve_own(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register new admin
  const joinConnection: api.IConnection = { host: connection.host };
  const joinEmail = typia.random<string & tags.Format<"email">>();
  const joinPassword = RandomGenerator.alphaNumeric(16);
  const joinResult = await authorize_admin_join(joinConnection, {
    body: {
      email: joinEmail,
      password: joinPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(joinResult);
  // 2. Login with admin credentials
  const loginConnection: api.IConnection = { host: connection.host };
  const loginResult = await authorize_admin_login(loginConnection, {
    body: {
      email: joinEmail,
      password: joinPassword,
    } satisfies IEcommerceMallAdmin.ILogin,
  });
  typia.assert(loginResult);
  // 3. Retrieve session using session ID from login response
  // Note: Session ID is extracted from the login response structure
  const sessionConnection: api.IConnection = { host: connection.host };
  const sessionId: string & tags.Format<"uuid"> = loginResult.token.access;
  const session = await api.functional.ecommerceMall.admin.sessions.at(
    sessionConnection,
    {
      sessionId,
    },
  );
  typia.assert(session);
  // 4. Validate session response
  TestValidator.equals(
    "session owner email",
    session.seller.email,
    joinResult.email,
  );
  TestValidator.equals(
    "session owner isBanned",
    session.seller.isBanned,
    joinResult.isBanned,
  );
  TestValidator.equals(
    "session owner approvalStatus",
    session.seller.approvalStatus,
    joinResult.isBanned ? "rejected" : "approved",
  );
  TestValidator.equals("session ip present", session.ip.length > 0, true);
  TestValidator.equals("session href present", session.href.length > 0, true);
  TestValidator.equals(
    "session referrer present",
    session.referrer.length > 0,
    true,
  );
}
