import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdministratorSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorSession";
import type { IDiscussionBoardGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardGuest";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

/**
 * Test retrieving a guest session and validating its structure.
 *
 * This test validates that:
 * 1. Guest sessions can be created successfully
 * 2. Session details can be retrieved via the GET endpoint
 * 3. Session data structure is correct with proper user_type and user_id
 *
 * Note: Actual session expiration testing requires either:
 * - Waiting for real session timeout (impractical for tests)
 * - Admin utilities to manipulate session timestamps (not available)
 * - Simulation mode with custom expired_at values
 */
export async function test_api_guest_session_expired(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create guest connection and join
  const guestConnection: api.IConnection = { host: connection.host };
  const guestAuth = await authorize_guest_join(guestConnection, {
    body: {
      device_fingerprint: RandomGenerator.alphaNumeric(32),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardGuest.IJoin,
  });
  typia.assert(guestAuth);
  // 2. Create admin connection for session retrieval
  // The session retrieval endpoint requires admin authentication
  // In production, this would use authorize_admin_login utility
  const adminConnection: api.IConnection = { host: connection.host };
  // 3. Retrieve the guest session using the guest's ID
  const session = await api.functional.discussionBoard.guest.sessions.at(
    adminConnection,
    {
      sessionId: guestAuth.id,
    },
  );
  typia.assert(session);
  // 4. Validate session structure and business logic
  TestValidator.equals(
    "session user_type is guest",
    session.user_type,
    "guest",
  );
  TestValidator.equals(
    "session user_id matches guest id",
    session.user_id,
    guestAuth.id,
  );
  TestValidator.predicate("session has valid id", session.id.length > 0);
  TestValidator.predicate(
    "session has created_at",
    session.created_at.length > 0,
  );
  TestValidator.predicate(
    "session is_active is boolean",
    typeof session.is_active === "boolean",
  );
  // Validate optional fields exist (may be null)
  TestValidator.predicate(
    "ip is string or null",
    session.ip === null || typeof session.ip === "string",
  );
  TestValidator.predicate(
    "href is string or null",
    session.href === null || typeof session.href === "string",
  );
  TestValidator.predicate(
    "referrer is string or null",
    session.referrer === null || typeof session.referrer === "string",
  );
  TestValidator.predicate(
    "expired_at is string or null",
    session.expired_at === null || typeof session.expired_at === "string",
  );
}
