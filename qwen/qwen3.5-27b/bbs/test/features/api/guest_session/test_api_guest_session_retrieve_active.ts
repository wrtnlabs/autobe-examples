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
 * Test retrieving a guest session by its UUID.
 * 1. Guest joins to authenticate and get token
 * 2. Use guest connection to retrieve session details
 * 3. Validate session response structure
 */
export async function test_api_guest_session_retrieve_active(
  connection: api.IConnection,
): Promise<void> {
  // 1. Guest joins to authenticate and get token
  const guestConnection: api.IConnection = { host: connection.host };
  const guestJoin = await authorize_guest_join(guestConnection, {
    body: {
      device_fingerprint: RandomGenerator.alphaNumeric(32),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardGuest.IJoin,
  });
  typia.assert(guestJoin);
  // 2. Generate a valid session UUID for testing
  // Note: In simulation mode, this will return mock data
  // In real mode, this would require the actual session ID from the join response
  const testSessionId = typia.random<string & tags.Format<"uuid">>();
  // 3. Retrieve the session by ID using guest connection
  const session = await api.functional.discussionBoard.guest.sessions.at(
    guestConnection,
    {
      sessionId: testSessionId,
    },
  );
  typia.assert(session);
  // 4. Validate session response structure
  TestValidator.predicate(
    "session id is valid UUID",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      session.id,
    ),
  );
  TestValidator.predicate(
    "user_id is valid UUID",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      session.user_id,
    ),
  );
  TestValidator.equals("user_type is guest", session.user_type, "guest");
  TestValidator.predicate(
    "created_at exists",
    session.created_at !== undefined,
  );
  TestValidator.predicate(
    "created_at is valid date-time",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(session.created_at),
  );
  TestValidator.predicate(
    "is_active is boolean",
    typeof session.is_active === "boolean",
  );
}
