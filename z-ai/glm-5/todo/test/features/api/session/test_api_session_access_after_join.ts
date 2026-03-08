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

export async function test_api_session_access_after_join(
  connection: api.IConnection,
): Promise<void> {
  // Prepare registration data with known values for verification
  const email = typia.random<string & tags.Format<"email">>();
  const href = typia.random<string & tags.Format<"uri">>();
  const referrer = typia.random<string & tags.Format<"uri">>();
  // Create a new member account and authentication session
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_guest_join(memberConnection, {
    body: { email, href, referrer },
  });
  typia.assert(authorized);
  // Retrieve the session using the authenticated connection
  const session = await api.functional.todoApp.guest.sessions.at(
    memberConnection,
    { sessionId: authorized.id },
  );
  typia.assert(session);
  // Verify session belongs to the authenticated member
  TestValidator.equals(
    "session member id matches",
    session.member.id,
    authorized.id,
  );
  TestValidator.equals(
    "session member email matches",
    session.member.email,
    email,
  );
  // Verify connection metadata was captured correctly
  TestValidator.equals("session href matches", session.href, href);
  TestValidator.equals("session referrer matches", session.referrer, referrer);
  // Verify server captured client IP address (passed as null, server captures actual)
  TestValidator.predicate("server captured client IP", session.ip.length > 0);
}
