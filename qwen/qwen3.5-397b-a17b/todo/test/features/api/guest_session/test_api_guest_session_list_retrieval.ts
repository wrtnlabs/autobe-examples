import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoAppMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppMemberSession";
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

/**
 * Test guest session list retrieval with pagination and sorting validation.
 *
 * Validates the complete guest session list retrieval workflow including guest authentication, session list query, and response structure validation. Ensures that the paginated response contains correct metadata and session records with all required fields.
 *
 * Special attention is given to verifying that sessions are sorted by created_at in descending order (most recent first) and that each session record contains complete metadata including member profile relation, IP address, login page URL, referrer, and timestamps.
 *
 * 1. Guest authenticates using device fingerprint registration.
 * 2. Guest calls session list endpoint with pagination parameters.
 * 3. Validates pagination metadata structure (current, limit, records, pages).
 * 4. Validates each session record contains all required fields.
 * 5. Verifies sessions are sorted by created_at in descending order.
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
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies ITodoAppGuest.IJoin,
  });
  typia.assert(authResult);
  // 2. Retrieve session list
  const sessionList = await api.functional.todoApp.guest.sessions.index(
    guestConnection,
    {
      body: {
        page: 1,
        limit: 10,
      } satisfies ITodoAppMemberSession.IRequest,
    },
  );
  typia.assert(sessionList);
  // 3. Validate each session record has complete structure
  for (const session of sessionList.data) {
    typia.assert(session);
  }
  // 4. Verify sessions are sorted by created_at DESC (most recent first)
  if (sessionList.data.length > 1) {
    for (let i = 0; i < sessionList.data.length - 1; i++) {
      const current = new Date(sessionList.data[i].created_at).getTime();
      const next = new Date(sessionList.data[i + 1].created_at).getTime();
      TestValidator.predicate(
        `session ${i} created_at >= session ${i + 1} created_at (DESC order)`,
        current >= next,
      );
    }
  }
}
