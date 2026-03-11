import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ITodoAppGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppGuest";
import type { ITodoAppGuestSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppGuestSession";
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
  // 1. Guest authentication - establish session
  const guestConnection: api.IConnection = { host: connection.host };
  const guest = await authorize_guest_join(guestConnection, {
    body: {
      device_fingerprint: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies ITodoAppGuest.IJoin,
  });
  typia.assert(guest);
  // 2. Extract session from authenticated guest response
  TestValidator.predicate("guest has sessions", guest.sessions.length > 0);
  const session = guest.sessions[0]!;
  // 3. Retrieve session details using GET /todoApp/guest/sessions/{sessionId}
  const sessionDetails = await api.functional.todoApp.guest.sessions.at(
    guestConnection,
    {
      sessionId: session.id,
    },
  );
  typia.assert(sessionDetails);
  // 4. Validate session details match between join response and retrieval
  TestValidator.equals("session ID matches", sessionDetails.id, session.id);
  TestValidator.equals("IP address matches", sessionDetails.ip, session.ip);
  TestValidator.equals("href matches", sessionDetails.href, session.href);
  TestValidator.equals(
    "referrer matches",
    sessionDetails.referrer,
    session.referrer,
  );
  TestValidator.equals(
    "created_at matches",
    sessionDetails.created_at,
    session.created_at,
  );
  TestValidator.equals(
    "expired_at matches",
    sessionDetails.expired_at,
    session.expired_at,
  );
}
