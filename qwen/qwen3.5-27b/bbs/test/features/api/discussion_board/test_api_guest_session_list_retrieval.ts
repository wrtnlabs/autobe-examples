import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrator";
import type { IDiscussionBoardAdministratorSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorSession";
import type { IDiscussionBoardGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardGuest";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardAdministratorSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdministratorSession";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

/**
 * Test guest session list retrieval after authentication.
 * 1. Authenticate as guest using device fingerprint
 * 2. Retrieve paginated list of sessions
 * 3. Validate session summary structure and pagination metadata
 */
export async function test_api_guest_session_list_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Guest authentication
  const guestConnection: api.IConnection = { host: connection.host };
  const authResult = await authorize_guest_join(guestConnection, {
    body: {
      device_fingerprint: RandomGenerator.alphaNumeric(32),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardGuest.IJoin,
  });
  typia.assert(authResult);
  // 2. Retrieve session list with default pagination
  const sessions = await api.functional.discussionBoard.guest.sessions.index(
    guestConnection,
    {
      body: {} satisfies IDiscussionBoardAdministratorSession.IRequest,
    },
  );
  typia.assert(sessions);
  // 3. Validate pagination metadata
  TestValidator.equals("current page is 1", sessions.pagination.current, 1);
  TestValidator.equals("limit is 20", sessions.pagination.limit, 20);
  TestValidator.predicate(
    "records count is non-negative",
    sessions.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages count is non-negative",
    sessions.pagination.pages >= 0,
  );
  // 4. Validate session data structure
  TestValidator.predicate(
    "sessions array exists",
    Array.isArray(sessions.data),
  );
  // 5. Validate each session summary if data exists
  if (sessions.data.length > 0) {
    const firstSession = sessions.data[0];
    // Validate required fields exist
    TestValidator.predicate("session has id", firstSession.id !== undefined);
    TestValidator.predicate(
      "session has actor_type",
      firstSession.actor_type !== undefined,
    );
    TestValidator.predicate(
      "session has created_at",
      firstSession.created_at !== undefined,
    );
    // expired_at can be null (active sessions) or date-time string
    TestValidator.predicate(
      "session has expired_at (null or date-time)",
      firstSession.expired_at === null ||
        typeof firstSession.expired_at === "string",
    );
    // Validate actor_type is valid enum value
    TestValidator.predicate(
      "actor_type is guest",
      firstSession.actor_type === "guest",
    );
    // Validate optional fields (can be null)
    TestValidator.predicate(
      "ip is null or string",
      firstSession.ip === null || typeof firstSession.ip === "string",
    );
    TestValidator.predicate(
      "href is null or string",
      firstSession.href === null || typeof firstSession.href === "string",
    );
    // Validate actor field exists and has required properties
    TestValidator.predicate("actor exists", firstSession.actor !== undefined);
    TestValidator.predicate(
      "actor has id",
      firstSession.actor.id !== undefined,
    );
    TestValidator.predicate(
      "actor has device_fingerprint",
      "device_fingerprint" in firstSession.actor &&
        firstSession.actor.device_fingerprint !== undefined,
    );
  }
}
