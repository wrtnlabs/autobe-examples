import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPortalMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPortalMember";

/**
 * Validate that a non-owner cannot soft-delete another user's account.
 *
 * Business context:
 *
 * 1. Two members are created via POST /auth/member/join (targetUser and
 *    attackerUser).
 * 2. The attacker (authenticated) attempts to DELETE
 *    /communityPortal/member/users/{targetUserId}.
 * 3. The operation must fail (permission enforcement). We assert an error is
 *    thrown.
 * 4. Confirm the target account remains by attempting to register the same
 *    username/email again and expecting registration to fail (uniqueness
 *    constraint), because explicit profile retrieval or login endpoints are not
 *    available in the provided SDK.
 *
 * Steps implemented:
 *
 * - Create isolated connections for each user so their Authorization headers do
 *   not collide.
 * - Use ICommunityPortalMember.ICreate bodies with `satisfies` to ensure correct
 *   typing.
 * - Use typia.assert() to validate returned authorized objects.
 * - Use await TestValidator.error(...) for the unauthorized delete attempt and
 *   for the duplicate registration check.
 */
export async function test_api_user_account_soft_delete_forbidden_when_not_owner(
  connection: api.IConnection,
) {
  // Create isolated connections so join() will set tokens independently
  const targetConn: api.IConnection = { ...connection, headers: {} };
  const attackerConn: api.IConnection = { ...connection, headers: {} };

  // 1) Register the target user
  const targetBody = {
    username: `target_${RandomGenerator.alphaNumeric(8)}`,
    email: typia.random<string & tags.Format<"email">>(),
    password: "P@ssw0rd123!",
    display_name: RandomGenerator.name(),
  } satisfies ICommunityPortalMember.ICreate;

  const targetAuth: ICommunityPortalMember.IAuthorized =
    await api.functional.auth.member.join(targetConn, { body: targetBody });
  typia.assert(targetAuth);
  // Basic sanity check: token exists
  TestValidator.predicate(
    "target token exists and is non-empty",
    typeof targetAuth.token?.access === "string" &&
      targetAuth.token.access.length > 0,
  );

  // 2) Register the attacker user
  const attackerBody = {
    username: `attacker_${RandomGenerator.alphaNumeric(8)}`,
    email: typia.random<string & tags.Format<"email">>(),
    password: "P@ssw0rd123!",
    display_name: RandomGenerator.name(),
  } satisfies ICommunityPortalMember.ICreate;

  const attackerAuth: ICommunityPortalMember.IAuthorized =
    await api.functional.auth.member.join(attackerConn, { body: attackerBody });
  typia.assert(attackerAuth);

  // 3) Attacker attempts to soft-delete the target => expect an error (forbidden / unauthorized)
  await TestValidator.error(
    "non-owner cannot soft-delete another user's account",
    async () => {
      await api.functional.communityPortal.member.users.erase(attackerConn, {
        userId: targetAuth.id,
      });
    },
  );

  // 4) Confirm the target user remains active by asserting that attempting to
  //    register the same username/email again fails (uniqueness constraint).
  await TestValidator.error(
    "duplicate registration for existing username/email should fail (target remains)",
    async () => {
      const dupConn: api.IConnection = { ...connection, headers: {} };
      await api.functional.auth.member.join(dupConn, { body: targetBody });
    },
  );
}
