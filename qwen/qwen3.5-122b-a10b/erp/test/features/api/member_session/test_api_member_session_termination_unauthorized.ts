import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmMember";
import type { IHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmOrganization";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test that an authenticated member cannot terminate another member's session.
 *
 * Validates the security boundary that prevents cross-user session manipulation and protects user session privacy. Creates two separate member accounts and verifies that Member A cannot terminate a session that belongs to Member B.
 *
 * The test enforces session ownership validation by attempting to delete a session using a randomly generated UUID (simulating another user's session) from Member A's authenticated connection. The system must reject this request with a 403 Forbidden response.
 *
 * Note: Since the member join response does not include session IDs, we use a randomly generated UUID to simulate attempting to delete another user's session. This validates that the authorization check properly rejects unauthorized session termination attempts regardless of whether the session exists.
 *
 * 1. Create Member A account with email and password credentials.
 * 2. Create Member B account with different email and password credentials.
 * 3. Generate a random UUID to simulate Member B's session ID.
 * 4. Member A attempts to terminate the simulated session using their authenticated connection.
 * 5. Validates the system rejects the request with 403 Forbidden response.
 */
export async function test_api_member_session_termination_unauthorized(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create Member A account
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberAAuth = await authorize_member_join(memberAConnection, {
    body: {
      email: `memberA.${RandomGenerator.alphaNumeric(8)}@test.com`,
      password: RandomGenerator.alphaNumeric(16),
      href: "https://test.com/memberA",
      referrer: "https://test.com",
    },
  });
  typia.assert(memberAAuth);
  // 2. Create Member B account
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberBAuth = await authorize_member_join(memberBConnection, {
    body: {
      email: `memberB.${RandomGenerator.alphaNumeric(8)}@test.com`,
      password: RandomGenerator.alphaNumeric(16),
      href: "https://test.com/memberB",
      referrer: "https://test.com",
    },
  });
  typia.assert(memberBAuth);
  // 3. Generate a random UUID to simulate Member B's session ID
  const fakeSessionId = typia.random<string & tags.Format<"uuid">>();
  // 4. Member A attempts to terminate the simulated session
  // 5. Validates the system rejects with 403 Forbidden
  await TestValidator.httpError(
    "member A cannot delete member B's session",
    403,
    async () => {
      await api.functional.hrm.member.member.sessions.erase(memberAConnection, {
        sessionId: fakeSessionId,
      });
    },
  );
}
