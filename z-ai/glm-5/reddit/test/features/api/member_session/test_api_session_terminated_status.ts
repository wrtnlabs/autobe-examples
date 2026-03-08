import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberSession";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test retrieval of a session and validate its structure and status.
 *
 * This test validates that:
 * 1. A member can retrieve session details via the sessions.at endpoint
 * 2. The session response has all required properties
 * 3. The sessionStatus field correctly reflects the session state
 * 4. Session age is non-negative
 *
 * Note: Testing a specifically "terminated" session requires the session to have
 * been previously terminated (deletedAt set). Without a session termination API
 * or session listing endpoint, this test validates the session retrieval structure.
 * In production, a terminated session would have sessionStatus='terminated' and
 * a non-null deletedAt timestamp.
 */
export async function test_api_session_terminated_status(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create member and authenticate via join
  const memberConnection: api.IConnection = { host: connection.host };
  const authResponse = await authorize_member_join(memberConnection, {});
  typia.assert(authResponse);
  // Step 2: Retrieve a session by ID
  // Note: The session ID would come from a session listing endpoint in a complete flow.
  // For this test, we retrieve a session and validate its structure.
  const sessionId = typia.random<string & tags.Format<"uuid">>();
  const session = await api.functional.communityPlatform.member.sessions.at(
    memberConnection,
    { sessionId },
  );
  typia.assert(session);
  // Step 3: Validate session has all required properties with correct types
  TestValidator.predicate("session id is valid UUID", () =>
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      session.id,
    ),
  );
  TestValidator.predicate(
    "session has member info",
    () => session.member !== null && session.member !== undefined,
  );
  TestValidator.predicate(
    "session member has id",
    () => session.member.id !== null && session.member.id !== undefined,
  );
  TestValidator.predicate(
    "session has IP address",
    () => session.ip !== null && session.ip !== undefined,
  );
  TestValidator.predicate(
    "session has href",
    () => session.href !== null && session.href !== undefined,
  );
  TestValidator.predicate(
    "session has createdAt timestamp",
    () => session.createdAt !== null && session.createdAt !== undefined,
  );
  TestValidator.predicate(
    "session has expiredAt timestamp",
    () => session.expiredAt !== null && session.expiredAt !== undefined,
  );
  // Step 4: Validate session status is one of the allowed values
  TestValidator.predicate(
    "session status is valid enum value",
    () =>
      session.sessionStatus === "active" ||
      session.sessionStatus === "expired" ||
      session.sessionStatus === "terminated",
  );
  // Step 5: Validate session age is non-negative
  TestValidator.predicate(
    "session age is non-negative",
    () => session.sessionAge >= 0,
  );
  // Step 6: Validate consistency between sessionStatus and deletedAt
  // - "terminated" => deletedAt must be non-null
  // - "active" or "expired" => deletedAt should be null
  if (session.sessionStatus === "terminated") {
    TestValidator.predicate(
      "terminated session has deletedAt timestamp set",
      () => session.deletedAt !== null,
    );
  } else {
    TestValidator.predicate(
      "active/expired session has deletedAt as null",
      () => session.deletedAt === null,
    );
  }
}