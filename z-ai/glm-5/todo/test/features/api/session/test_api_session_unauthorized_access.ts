import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIPrivateTodoAppMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIPrivateTodoAppMemberSession";
import type { IPrivateTodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IPrivateTodoAppMember";
import type { IPrivateTodoAppMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPrivateTodoAppMemberSession";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test that a member cannot retrieve another member's session (privacy enforcement).
 *
 * Test Steps:
 * 1. Authenticate as member A via join endpoint and create a session
 * 2. List member A's sessions to obtain a valid sessionId owned by member A
 * 3. Authenticate as a different member B via join endpoint
 * 4. Attempt to retrieve member A's session using the sessionId obtained in step 2
 * 5. Verify the response returns 404 Not Found status code (not 403, to prevent enumeration)
 *
 * This validates the privacy enforcement that only the session owner can view their session details.
 * The system returns 404 for both non-existent sessions and sessions owned by other members
 * to prevent session enumeration attacks.
 */
export async function test_api_session_unauthorized_access(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Authenticate as member A via join endpoint
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberA = await authorize_member_join(memberAConnection, {});
  typia.assert(memberA);
  // Step 2: List member A's sessions to obtain a valid sessionId
  const sessionsPage =
    await api.functional.privateTodoApp.member.sessions.index(
      memberAConnection,
      {
        body: {
          page: 1,
          limit: 10,
        } satisfies IPrivateTodoAppMemberSession.IRequest,
      },
    );
  typia.assert(sessionsPage);
  TestValidator.predicate(
    "member A has sessions",
    sessionsPage.data.length > 0,
  );
  const memberASessionId = sessionsPage.data[0].id;
  // Step 3: Authenticate as member B (different member)
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberB = await authorize_member_join(memberBConnection, {});
  typia.assert(memberB);
  // Step 4 & 5: Attempt to retrieve member A's session using member B's connection
  // Should return 404 Not Found (not 403, to prevent enumeration)
  await TestValidator.httpError(
    "member B cannot access member A's session",
    404,
    async () => {
      await api.functional.privateTodoApp.member.sessions.at(
        memberBConnection,
        {
          sessionId: memberASessionId,
        },
      );
    },
  );
}
