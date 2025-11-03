import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityBbsCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsCommunityMember";

/**
 * Ensure that one community member cannot update another member's profile.
 *
 * Steps:
 *
 * 1. Create owner account via POST /auth/communityMember/join with a known
 *    profile.display_name.
 * 2. Create attacker account via POST /auth/communityMember/join.
 * 3. Using the attacker's token, attempt to PUT the owner's profile -> expect an
 *    error (forbidden attempt).
 * 4. Using the owner's token, successfully update the owner's profile and verify
 *    the change. This demonstrates that unauthorized member could not alter the
 *    owner's profile.
 */
export async function test_api_community_member_update_profile_forbidden_by_other_member(
  connection: api.IConnection,
) {
  // 1. Prepare isolated connection objects for owner and attacker so that
  //    SDK-issued Authorization headers are stored per-connection.
  const ownerConn: api.IConnection = { ...connection, headers: {} };
  const attackerConn: api.IConnection = { ...connection, headers: {} };

  // 2. Create owner account with deterministic display name
  const ownerDisplayName = `owner-${RandomGenerator.alphaNumeric(6)}`;
  const ownerCreateBody = {
    email: typia.random<string & tags.Format<"email">>(),
    username: RandomGenerator.alphaNumeric(8),
    password: `P@ssw0rd${RandomGenerator.alphaNumeric(3)}`,
    display_name: ownerDisplayName,
    profile: {
      display_name: ownerDisplayName,
      bio: RandomGenerator.paragraph({ sentences: 6 }),
      avatar_uri: null,
    },
    session_context: {
      href: "https://example.test/signup",
      referrer: "https://example.test/",
      ip: null,
      session_ttl_seconds: null,
    },
  } satisfies ICommunityBbsCommunityMember.ICreate;

  const ownerAuth: ICommunityBbsCommunityMember.IAuthorized =
    await api.functional.auth.communityMember.join(ownerConn, {
      body: ownerCreateBody,
    });
  typia.assert(ownerAuth);
  const ownerSummary = ownerAuth.member;

  // Validate initial owner display name as returned by join
  TestValidator.equals(
    "owner initial display_name matches provided value",
    ownerSummary.display_name,
    ownerDisplayName,
  );

  // 3. Create attacker account
  const attackerCreateBody = {
    email: typia.random<string & tags.Format<"email">>(),
    username: RandomGenerator.alphaNumeric(8),
    password: `P@ssw0rd${RandomGenerator.alphaNumeric(3)}`,
    display_name: `att-${RandomGenerator.alphaNumeric(5)}`,
    profile: {
      display_name: `att-${RandomGenerator.alphaNumeric(5)}`,
      bio: RandomGenerator.paragraph({ sentences: 4 }),
      avatar_uri: null,
    },
    session_context: {
      href: "https://example.test/signup",
      referrer: "https://example.test/",
      ip: null,
      session_ttl_seconds: null,
    },
  } satisfies ICommunityBbsCommunityMember.ICreate;

  const attackerAuth: ICommunityBbsCommunityMember.IAuthorized =
    await api.functional.auth.communityMember.join(attackerConn, {
      body: attackerCreateBody,
    });
  typia.assert(attackerAuth);

  // 4. Attempt update as attacker (should fail)
  const hackedName = `hacked-${RandomGenerator.alphaNumeric(6)}`;
  await TestValidator.error(
    "attacker cannot update another member profile",
    async () => {
      await api.functional.communityBbs.communityMember.communityMembers.update(
        attackerConn,
        {
          username: ownerSummary.username,
          body: {
            display_name: hackedName,
          } satisfies ICommunityBbsCommunityMember.IUpdate,
        },
      );
    },
  );

  // 5. As the legitimate owner, perform an authorized update to confirm owner
  //    remains able to update their profile and that the original display
  //    name was not silently changed by the attacker.
  const newOwnerDisplay = `owner-new-${RandomGenerator.alphaNumeric(6)}`;
  const updated: ICommunityBbsCommunityMember.ISummary =
    await api.functional.communityBbs.communityMember.communityMembers.update(
      ownerConn,
      {
        username: ownerSummary.username,
        body: {
          display_name: newOwnerDisplay,
        } satisfies ICommunityBbsCommunityMember.IUpdate,
      },
    );
  typia.assert(updated);

  TestValidator.equals(
    "owner update applied and returns new display_name",
    updated.display_name,
    newOwnerDisplay,
  );

  TestValidator.notEquals(
    "owner display_name changed from initial to updated",
    ownerSummary.display_name,
    updated.display_name,
  );
}
