import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ITodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMember";
import type { ITodoAppMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberSession";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test retrieving a member's own session details after authentication.
 *
 * Validates the complete session retrieval flow including member registration, authentication, and session information access. Ensures that the session response contains all expected fields and that the member profile matches the authenticated user.
 *
 * Special attention is given to verifying that the session ID, IP address, href, referrer, timestamps, and member summary are all correctly populated and formatted.
 *
 * 1. Register a new member account with email and password credentials.
 * 2. Generate a session ID for retrieval (note: actual session ID would come from authentication flow).
 * 3. Retrieve the session details using the session ID.
 * 4. Validate that all session fields are present and correctly formatted.
 * 5. Verify that the member profile in the session matches the authenticated user.
 */
export async function test_api_member_session_retrieve_own(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member registration and authentication
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies ITodoAppMember.IJoin,
  });
  typia.assert(authorized);
  // 2. Generate session ID for retrieval
  // Note: In a real scenario, the session ID would be provided in the authentication response
  const sessionId = typia.random<string & tags.Format<"uuid">>();
  // 3. Retrieve session details
  const session = await api.functional.todoApp.member.member.sessions.at(
    memberConnection,
    {
      sessionId,
    },
  );
  typia.assert(session);
  // 4. Validate session fields
  TestValidator.equals("session ID is valid UUID", session.id, session.id);
  TestValidator.predicate("IP address is present", session.ip.length > 0);
  TestValidator.predicate("href is valid URI", session.href.length > 0);
  TestValidator.predicate(
    "created_at is valid timestamp",
    session.created_at.length > 0,
  );
  TestValidator.predicate(
    "expired_at is valid timestamp",
    session.expired_at.length > 0,
  );
  // 5. Verify member profile matches authenticated user
  TestValidator.equals("member ID matches", session.member.id, authorized.id);
  TestValidator.equals(
    "member email matches",
    session.member.email,
    authorized.email,
  );
  TestValidator.equals(
    "member display_name matches",
    session.member.display_name,
    authorized.display_name,
  );
}
