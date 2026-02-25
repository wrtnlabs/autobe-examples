import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityMember";
import type { ICommunityMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityMemberSession";
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
 * Test that an authenticated member receives 403 Forbidden when attempting
 * to view another member's session. This validates the authorization rule
 * that members can only view their own sessions, ensuring session privacy
 * and preventing unauthorized access to authentication metadata.
 */
export async function test_api_session_other_member_forbidden(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create member1 account with session1
  const member1Connection: api.IConnection = { host: connection.host };
  const member1 = await authorize_member_join(member1Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: `Password${RandomGenerator.alphaNumeric(6)}1!`,
      username: RandomGenerator.alphaNumeric(12),
      display_name: RandomGenerator.name(),
      href: "https://example.com/login",
    },
  });
  typia.assert(member1);
  // Step 2: Create member2 account with session2
  const member2Connection: api.IConnection = { host: connection.host };
  const member2 = await authorize_member_join(member2Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: `Password${RandomGenerator.alphaNumeric(6)}1!`,
      username: RandomGenerator.alphaNumeric(12),
      display_name: RandomGenerator.name(),
      href: "https://example.com/login",
    },
  });
  typia.assert(member2);
  // Step 3: member2 attempts to access member1's session
  // Using member1's ID as session identifier to test authorization
  await TestValidator.httpError(
    "member2 cannot access member1's session",
    403,
    async () => {
      await api.functional.community.member.sessions.at(member2Connection, {
        sessionId: member1.id,
      });
    },
  );
}
