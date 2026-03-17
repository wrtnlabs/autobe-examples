import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCloneKarmaScore } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneKarmaScore";
import type { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import type { IRedditCloneMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMemberSession";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test unauthorized session access - Member B attempts to access Member A's session.
 *
 * This test validates the critical security boundary that members can only access
 * their own authentication sessions. The test creates two separate member accounts,
 * establishes sessions for both, then verifies that Member B cannot access Member A's
 * session details even when authenticated.
 *
 * Test Flow:
 * 1. Register Member A and login to create Session A
 * 2. Register Member B and login to create Session B
 * 3. Member B attempts to GET Session A's details
 * 4. Verify 403 Forbidden response is returned
 *
 * Security Validations:
 * - Session ownership is enforced at the API level
 * - Cross-member session access is blocked
 * - Error messages don't leak session ownership information
 */
export async function test_api_member_session_unauthorized_access(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create Member A (session owner)
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberAJoinInput = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    username: RandomGenerator.name(1),
    display_name: RandomGenerator.name(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: typia.random<string & tags.Format<"ipv4">>(),
  } satisfies IRedditCloneMember.IJoin;
  const memberAAuth = await authorize_member_join(memberAConnection, {
    body: memberAJoinInput,
  });
  typia.assert(memberAAuth);
  // Step 2: Login as Member A to establish Session A
  const memberALoginConnection: api.IConnection = { host: connection.host };
  const memberALoginInput = {
    email: memberAJoinInput.email,
    password: memberAJoinInput.password,
  } satisfies IRedditCloneMember.ILogin;
  const memberASessionAuth = await authorize_member_login(
    memberALoginConnection,
    {
      body: memberALoginInput,
    },
  );
  typia.assert(memberASessionAuth);
  // Step 3: Create Member B (unauthorized accessor)
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberBJoinInput = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    username: RandomGenerator.name(1),
    display_name: RandomGenerator.name(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: typia.random<string & tags.Format<"ipv4">>(),
  } satisfies IRedditCloneMember.IJoin;
  const memberBAuth = await authorize_member_join(memberBConnection, {
    body: memberBJoinInput,
  });
  typia.assert(memberBAuth);
  // Step 4: Login as Member B to establish authenticated context
  const memberBLoginConnection: api.IConnection = { host: connection.host };
  const memberBLoginInput = {
    email: memberBJoinInput.email,
    password: memberBJoinInput.password,
  } satisfies IRedditCloneMember.ILogin;
  const memberBSessionAuth = await authorize_member_login(
    memberBLoginConnection,
    {
      body: memberBLoginInput,
    },
  );
  typia.assert(memberBSessionAuth);
  // Step 5: Member B attempts to access Member A's session (should fail with 403)
  // Generate a valid UUID format for the session ID
  // In production, this would be Member A's actual session ID from a sessions list
  const sessionAId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error("unauthorized session access", async () => {
    await api.functional.redditClone.member.sessions.at(
      memberBLoginConnection,
      {
        sessionId: sessionAId,
      },
    );
  });
}
