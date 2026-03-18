import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmsGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsGuest";
import type { IHrmsGuestSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsGuestSession";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

export async function test_api_guest_session_retrieval_active_session(
  connection: api.IConnection,
): Promise<void> {
  // 1. Guest registration (creates initial session)
  const guestConnection: api.IConnection = { host: connection.host };
  const result = await authorize_guest_join(guestConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IHrmsGuest.IJoin,
  });
  typia.assert(result);
  // 2. Retrieve guest session using session token
  const sessionConnection: api.IConnection = { host: connection.host };
  sessionConnection.headers = {
    Authorization: `Bearer ${result.token.access}`,
  };
  const session = await api.functional.hrms.guest.guest_sessions.at(
    sessionConnection,
    {
      sessionId: result.token.access,
    },
  );
  typia.assert(session);
  // 3. Validate session fields
  TestValidator.equals("session has valid UUID id", session.id, session.id);
  TestValidator.equals("session has IP address", session.ip.length > 0, true);
  TestValidator.equals("session has href URL", session.href.length > 0, true);
  TestValidator.equals(
    "session has created_at timestamp",
    session.created_at.length > 0,
    true,
  );
  TestValidator.equals(
    "session has expired_at timestamp",
    session.expired_at.length > 0,
    true,
  );
  // 4. Validate guest information
  TestValidator.equals(
    "session has guest info",
    session.guest !== null && session.guest !== undefined,
    true,
  );
  if (session.guest) {
    TestValidator.equals(
      "guest has valid UUID id",
      session.guest.id,
      session.guest.id,
    );
    TestValidator.equals(
      "guest has device fingerprint",
      session.guest.device_fingerprint.length > 0,
      true,
    );
    TestValidator.equals(
      "guest has IP address (nullable)",
      typeof session.guest.ip_address === "string" ||
        session.guest.ip_address === null,
      true,
    );
    TestValidator.equals(
      "guest has created_at timestamp",
      session.guest.created_at.length > 0,
      true,
    );
  }
}
