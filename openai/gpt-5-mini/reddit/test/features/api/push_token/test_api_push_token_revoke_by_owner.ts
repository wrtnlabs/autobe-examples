import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityBbsCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsCommunityMember";
import type { ICommunityBbsPushToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsPushToken";

export async function test_api_push_token_revoke_by_owner(
  connection: api.IConnection,
) {
  /**
   * Test purpose:
   *
   * - Verify that a community member (owner) can revoke (soft-delete) their own
   *   push token.
   * - Verify that another community member cannot revoke someone else's push
   *   token (ownership enforcement).
   * - Verify idempotency of the revoke operation (subsequent revoke calls succeed
   *   / do not error).
   *
   * Flow:
   *
   * 1. Create owner account (join) using a fresh connection.
   * 2. Register a push token for the owner.
   * 3. Create attacker account using another fresh connection.
   * 4. Attempt revoke as attacker -> expect an error (ownership enforced).
   * 5. Revoke as owner -> expect success (no error).
   * 6. Revoke again as owner -> expect idempotent success (no error).
   */

  // 1. Prepare two isolated connections so SDK-managed headers do not conflict
  const ownerConn: api.IConnection = { ...connection, headers: {} };
  const attackerConn: api.IConnection = { ...connection, headers: {} };

  // 2. Owner signs up (join) and receives authorization (SDK injects Authorization into ownerConn)
  const ownerEmail = typia.random<string & tags.Format<"email">>();
  const ownerUsername = `owner_${RandomGenerator.alphaNumeric(6)}`;
  const ownerAuth: ICommunityBbsCommunityMember.IAuthorized =
    await api.functional.auth.communityMember.join(ownerConn, {
      body: {
        email: ownerEmail,
        username: ownerUsername,
        password: "Passw0rd!",
        session_context: {
          href: "https://example.test/welcome",
          referrer: "https://example.test/",
        },
      } satisfies ICommunityBbsCommunityMember.ICreate,
    });
  typia.assert(ownerAuth);
  TestValidator.equals(
    "owner username matches returned summary",
    ownerAuth.member.username,
    ownerUsername,
  );

  // 3. Register a push token as the owner
  const tokenValue = RandomGenerator.alphaNumeric(40);
  const deviceId = RandomGenerator.alphaNumeric(12);
  const pushCreateBody = {
    token: tokenValue,
    provider: "fcm",
    device_id: deviceId,
    platform: "android",
    fingerprint: RandomGenerator.alphaNumeric(16),
  } satisfies ICommunityBbsPushToken.ICreate;

  const push: ICommunityBbsPushToken =
    await api.functional.communityBbs.communityMember.communityMembers.pushTokens.create(
      ownerConn,
      {
        username: ownerAuth.member.username,
        body: pushCreateBody,
      },
    );
  typia.assert(push);
  TestValidator.equals("push provider is fcm", push.provider, "fcm");
  TestValidator.equals(
    "push device id matches",
    push.device_id ?? null,
    deviceId,
  );
  TestValidator.equals("push initially not revoked", push.revoked, false);

  // 4. Attacker signs up (separate connection)
  const attackerEmail = typia.random<string & tags.Format<"email">>();
  const attackerUsername = `attacker_${RandomGenerator.alphaNumeric(6)}`;
  const attackerAuth: ICommunityBbsCommunityMember.IAuthorized =
    await api.functional.auth.communityMember.join(attackerConn, {
      body: {
        email: attackerEmail,
        username: attackerUsername,
        password: "Passw0rd!",
        session_context: {
          href: "https://example.test/welcome",
          referrer: "https://example.test/",
        },
      } satisfies ICommunityBbsCommunityMember.ICreate,
    });
  typia.assert(attackerAuth);
  TestValidator.equals(
    "attacker username matches returned summary",
    attackerAuth.member.username,
    attackerUsername,
  );

  // 5. Attempt revoke as attacker -> expect an error (ownership enforcement)
  await TestValidator.error(
    "attacker cannot revoke another member's push token",
    async () => {
      await api.functional.communityBbs.communityMember.communityMembers.pushTokens.erase(
        attackerConn,
        {
          username: ownerAuth.member.username,
          pushTokenId: push.id,
        },
      );
    },
  );

  // 6. Revoke as owner -> expect success (no error thrown)
  await api.functional.communityBbs.communityMember.communityMembers.pushTokens.erase(
    ownerConn,
    {
      username: ownerAuth.member.username,
      pushTokenId: push.id,
    },
  );

  // 7. Idempotency: calling erase again as owner should succeed (no error)
  await TestValidator.predicate(
    "revoke operation is idempotent (second call succeeds)",
    async () => {
      await api.functional.communityBbs.communityMember.communityMembers.pushTokens.erase(
        ownerConn,
        {
          username: ownerAuth.member.username,
          pushTokenId: push.id,
        },
      );
      return true;
    },
  );

  // Note: Detailed DB assertions (deleted_at, revoked flag persisted, audit log) are not available via provided SDK functions.
  // The test verifies observable API behavior: unauthorized actor cannot revoke; owner can revoke; operation is idempotent.
}
