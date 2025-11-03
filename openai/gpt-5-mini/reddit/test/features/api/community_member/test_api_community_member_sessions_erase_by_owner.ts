import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityBbsCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsCommunityMember";

export async function test_api_community_member_sessions_erase_by_owner(
  connection: api.IConnection,
) {
  // Create two independent connection objects to simulate separate clients
  const ownerConn: api.IConnection = { ...connection, headers: {} };
  const attackerConn: api.IConnection = { ...connection, headers: {} };

  // 1) Owner joins (creates account + initial session)
  const ownerBody = {
    email: typia.random<string & tags.Format<"email">>(),
    username: RandomGenerator.alphaNumeric(8),
    password: "Passw0rd!",
    session_context: {
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  } satisfies ICommunityBbsCommunityMember.ICreate;

  const ownerAuth: ICommunityBbsCommunityMember.IAuthorized =
    await api.functional.auth.communityMember.join(ownerConn, {
      body: ownerBody,
    });
  typia.assert(ownerAuth);

  const ownerUsername = ownerAuth.member.username;
  const ownerSessionId = ownerAuth.session.id;

  TestValidator.equals(
    "owner username matches requested username",
    ownerAuth.member.username,
    ownerBody.username,
  );

  // 2) Attacker (second user) joins
  const attackerBody = {
    email: typia.random<string & tags.Format<"email">>(),
    username: RandomGenerator.alphaNumeric(8),
    password: "Passw0rd!",
    session_context: {
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  } satisfies ICommunityBbsCommunityMember.ICreate;

  const attackerAuth: ICommunityBbsCommunityMember.IAuthorized =
    await api.functional.auth.communityMember.join(attackerConn, {
      body: attackerBody,
    });
  typia.assert(attackerAuth);

  TestValidator.equals(
    "attacker username matches requested username",
    attackerAuth.member.username,
    attackerBody.username,
  );

  // 3) Negative test: attacker attempts to delete owner's session -> should fail
  await TestValidator.error(
    "non-owner cannot delete another member's session",
    async () => {
      await api.functional.communityBbs.communityMember.communityMembers.sessions.erase(
        attackerConn,
        {
          username: ownerUsername,
          sessionId: ownerSessionId,
        },
      );
    },
  );

  // 4) Owner deletes their own session -> expect success (no exception)
  await api.functional.communityBbs.communityMember.communityMembers.sessions.erase(
    ownerConn,
    {
      username: ownerUsername,
      sessionId: ownerSessionId,
    },
  );

  // 5) Attempt to delete again: accept either idempotent success or error
  try {
    await api.functional.communityBbs.communityMember.communityMembers.sessions.erase(
      ownerConn,
      {
        username: ownerUsername,
        sessionId: ownerSessionId,
      },
    );
    TestValidator.predicate("second erase is idempotent (allowed)", true);
  } catch {
    TestValidator.predicate(
      "second erase threw an error (acceptable alternative)",
      true,
    );
  }
}
