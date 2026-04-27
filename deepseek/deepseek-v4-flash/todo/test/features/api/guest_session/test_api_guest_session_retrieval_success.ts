import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ITodoAppGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppGuest";
import type { ITodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMember";
import type { ITodoAppMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberSession";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

export async function test_api_guest_session_retrieval_success(
  connection: api.IConnection,
): Promise<void> {
  // Prepare join input with specific values for later verification
  const href = typia.random<string & tags.Format<"uri">>();
  const referrer = typia.random<string & tags.Format<"uri">>();
  const ip = typia.random<string & tags.Format<"ipv4">>();
  // 1. Authenticate as a guest to obtain a session
  const guestConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_guest_join(guestConnection, {
    body: {
      href,
      referrer,
      ip,
    },
  });
  typia.assert(authorized);
  // Capture session ID from the refresh token
  // (the refresh token corresponds to the session identifier per the DTO documentation)
  const sessionId = authorized.token.refresh as unknown as string &
    tags.Format<"uuid">;
  // 2. Retrieve the session details using the captured session ID
  const session = await api.functional.todoApp.guest.sessions.at(
    guestConnection,
    {
      sessionId,
    },
  );
  typia.assert(session);
  // 3. Verify that the ip, href, and referrer match the values from the join request
  TestValidator.equals("ip matches join request", session.ip, ip);
  TestValidator.equals("href matches join request", session.href, href);
  TestValidator.equals(
    "referrer matches join request",
    session.referrer,
    referrer,
  );
}
