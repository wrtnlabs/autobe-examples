import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformGuest";
import type { IHrmPlatformMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMemberSession";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

export async function test_api_guest_session_retrieval_with_organization_context(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create guest session
  const joinOutput = await authorize_guest_join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: "192.168.1.100", // IPv4 format
    },
  });
  typia.assert(joinOutput);
  // 2. Capture session_id
  const sessionId = joinOutput.session_id;
  TestValidator.notEquals(
    "session_id exists for guest session",
    sessionId,
    null,
  );
  // 3. Create new connection for retrieval (connection isolation pattern)
  const retrievalConnection: api.IConnection = { host: connection.host };
  // 4. Retrieve session
  const session = await api.functional.hrmPlatform.guest.sessions.at(
    retrievalConnection,
    {
      sessionId: sessionId!,
    },
  );
  typia.assert(session);
  // 5. Verify organization_id is null for guest sessions (business rule)
  TestValidator.equals(
    "organization_id is null for guest session",
    session.organization_id,
    null,
  );
  // 6. Verify session_id is valid UUID format
  const uuidPattern =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  TestValidator.equals(
    "session id follows UUID format",
    uuidPattern.test(session.id),
    true,
  );
  // 7. Verify member_id is valid UUID
  TestValidator.equals(
    "member_id follows UUID format",
    uuidPattern.test(session.member_id),
    true,
  );
  // 8. Verify timestamps are properly formatted
  const createdAtDate = new Date(session.created_at);
  TestValidator.predicate(
    "created_at is valid date-time",
    !isNaN(createdAtDate.getTime()),
  );
  const updatedAtDate = new Date(session.updated_at);
  TestValidator.predicate(
    "updated_at is valid date-time",
    !isNaN(updatedAtDate.getTime()),
  );
  const accessTokenExpiresDate = new Date(session.access_token_expires_at);
  TestValidator.predicate(
    "access_token_expires_at is valid date-time",
    !isNaN(accessTokenExpiresDate.getTime()),
  );
  const refreshTokenExpiresDate = new Date(session.refresh_token_expires_at);
  TestValidator.predicate(
    "refresh_token_expires_at is valid date-time",
    !isNaN(refreshTokenExpiresDate.getTime()),
  );
  // Verify expired_at is either null or valid date
  if (session.expired_at !== null) {
    const expiredDate = new Date(session.expired_at);
    TestValidator.predicate(
      "expired_at is valid date-time when not null",
      !isNaN(expiredDate.getTime()),
    );
  } else {
    TestValidator.equals(
      "expired_at is null when session not expired",
      session.expired_at,
      null,
    );
  }
  // 9. Verify referrer can be null (optional field)
  typia.assert<(string & tags.Format<"uri">) | null | undefined>(
    session.referrer,
  );
  // 10. Verify ip_address and user_agent are non-empty strings
  TestValidator.predicate(
    "ip_address is non-empty string",
    session.ip_address.length > 0,
  );
  TestValidator.predicate(
    "user_agent is non-empty string",
    session.user_agent.length > 0,
  );
}
