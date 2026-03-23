import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCloneGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneGuest";
import type { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import type { IRedditCloneMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMemberSession";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

/**
 * Test that an authenticated guest can successfully retrieve their own active session details.
 * 1. Register a new guest account using POST /redditClone/auth/guest/join
 * 2. Capture the sessionId from the authentication response
 * 3. Call GET /redditClone/guest/sessions/{sessionId} with the captured sessionId
 * 4. Verify the response returns IRedditCloneMemberSession structure with all expected fields
 * 5. Validate that session belongs to the authenticated guest
 */
export async function test_api_guest_session_retrieve_own_active_session(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create guest connection and register
  const guestConnection: api.IConnection = { host: connection.host };
  const joinInput = {
    device_fingerprint: RandomGenerator.alphaNumeric(32),
    ip_address: typia.random<string & tags.Format<"ipv4">>(),
    user_agent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: typia.random<string & tags.Format<"ipv4">>(),
  } satisfies IRedditCloneGuest.IJoin;
  const authorized = await authorize_guest_join(guestConnection, {
    body: joinInput,
  });
  typia.assert(authorized);
  // 2. Retrieve session using the guest ID as session ID
  const session = await api.functional.redditClone.guest.sessions.at(
    guestConnection,
    {
      sessionId: authorized.id,
    },
  );
  typia.assert(session);
  // 3. Validate session belongs to the authenticated guest
  TestValidator.equals(
    "session ID matches guest ID",
    session.id,
    authorized.id,
  );
  // 4. Validate connection metadata matches registration data
  const expectedIp = joinInput.ip ?? joinInput.ip_address;
  TestValidator.equals("IP address matches", session.ip, expectedIp);
  TestValidator.equals("href matches", session.href, joinInput.href);
  TestValidator.equals(
    "referrer matches",
    session.referrer,
    joinInput.referrer,
  );
  TestValidator.equals(
    "user_agent matches",
    session.user_agent,
    joinInput.user_agent,
  );
  // 5. Validate member information is present
  TestValidator.predicate("member has ID", session.member.id.length > 0);
  TestValidator.predicate(
    "member has username",
    session.member.username.length > 0,
  );
  TestValidator.predicate(
    "member has display_name",
    session.member.display_name.length > 0,
  );
}
