import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityBbsCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsCommunityMember";

/**
 * Test session revocation (by single session id and global revoke) for a
 * community member.
 *
 * This E2E test verifies session revocation behavior using only the available
 * SDK functions. Due to SDK constraints (no refresh endpoint and no direct DB
 * access), the test validates revocation by inspecting the join (IAuthorized)
 * response's session summary and the revoke responses
 * (ISessionRevokeResponse).
 *
 * Steps:
 *
 * 1. Create member A via join → assert token and session are returned.
 * 2. Revoke member A's session via revokeSessions(mode='by_ids') → assert the
 *    response includes the session id and revoked_all is false.
 * 3. Create member B via join → assert session returned.
 * 4. Revoke all sessions for the current authenticated actor via
 *    revokeSessions(mode='all') → assert revoked_all is true and revoked_count
 *
 * > = 0. If the server enumerates revoked_session_ids, assert session id
 *    > membership.
 *
 * Notes: Direct refresh-token validation and audit-log DB checks are not
 * possible with the provided SDK surface, so they are intentionally omitted and
 * noted in the test documentation.
 */
export async function test_api_sessions_revoke_by_member(
  connection: api.IConnection,
) {
  // Unique suffix to avoid collisions
  const suffix = `${Date.now()}_${RandomGenerator.alphaNumeric(6)}`;
  const password = "Passw0rd!";

  // --- Member A: create and revoke single session ---
  const joinA = {
    email: `alice.${suffix}@example.test`,
    username: `alice_${suffix}`,
    password,
    session_context: {
      href: `https://test.local/welcome/${suffix}`,
      referrer: `https://ref.test/${suffix}`,
      ip: null,
      session_ttl_seconds: null,
    },
    profile: {
      display_name: `Alice ${suffix}`,
      bio: RandomGenerator.paragraph({ sentences: 5 }),
      avatar_uri: null,
    },
  } satisfies ICommunityBbsCommunityMember.ICreate;

  const authorizedA = await api.functional.auth.communityMember.join(
    connection,
    { body: joinA },
  );
  typia.assert(authorizedA);

  const tokenA = authorizedA.token;
  const sessionA = authorizedA.session;
  typia.assert(tokenA);
  typia.assert(sessionA);

  TestValidator.predicate(
    "member A: has access token",
    typeof tokenA.access === "string" && tokenA.access.length > 0,
  );
  TestValidator.predicate(
    "member A: has refresh token",
    typeof tokenA.refresh === "string" && tokenA.refresh.length > 0,
  );
  TestValidator.predicate(
    "member A: session id present",
    typeof sessionA.id === "string" && sessionA.id.length > 0,
  );

  // Revoke by ids
  const revokeByIds = {
    mode: "by_ids",
    session_ids: [sessionA.id],
    reason: "e2e: revoke single session",
  } satisfies ICommunityBbsCommunityMember.ISessionRevoke;

  const respByIds =
    await api.functional.auth.communityMember.sessions.revoke.revokeSessions(
      connection,
      { body: revokeByIds },
    );
  typia.assert(respByIds);

  TestValidator.predicate(
    "revoke by ids: includes target session id",
    Array.isArray(respByIds.revoked_session_ids) &&
      respByIds.revoked_session_ids.some((id) => id === sessionA.id),
  );
  TestValidator.predicate(
    "revoke by ids: revoked_all is false",
    respByIds.revoked_all === false,
  );
  TestValidator.predicate(
    "revoke by ids: revoked_count non-negative",
    typeof respByIds.revoked_count === "number" && respByIds.revoked_count >= 0,
  );

  // --- Member B: create and global revoke ---
  const joinB = {
    email: `bob.${suffix}@example.test`,
    username: `bob_${suffix}`,
    password,
    session_context: {
      href: `https://test.local/welcome/${suffix}/bob`,
      referrer: `https://ref.test/${suffix}/bob`,
      ip: null,
      session_ttl_seconds: null,
    },
    profile: {
      display_name: `Bob ${suffix}`,
      bio: RandomGenerator.paragraph({ sentences: 4 }),
      avatar_uri: null,
    },
  } satisfies ICommunityBbsCommunityMember.ICreate;

  const authorizedB = await api.functional.auth.communityMember.join(
    connection,
    { body: joinB },
  );
  typia.assert(authorizedB);
  const sessionB = authorizedB.session;
  typia.assert(sessionB);
  TestValidator.predicate(
    "member B: session id present",
    typeof sessionB.id === "string" && sessionB.id.length > 0,
  );

  // Revoke all sessions for the caller
  const revokeAll = {
    mode: "all",
    all: true,
    reason: "e2e: revoke all sessions",
  } satisfies ICommunityBbsCommunityMember.ISessionRevoke;

  const respAll =
    await api.functional.auth.communityMember.sessions.revoke.revokeSessions(
      connection,
      { body: revokeAll },
    );
  typia.assert(respAll);

  TestValidator.predicate(
    "revoke all: revoked_all true",
    respAll.revoked_all === true,
  );
  TestValidator.predicate(
    "revoke all: revoked_count non-negative",
    typeof respAll.revoked_count === "number" && respAll.revoked_count >= 0,
  );

  if (
    Array.isArray(respAll.revoked_session_ids) &&
    respAll.revoked_session_ids.length > 0
  ) {
    TestValidator.predicate(
      "revoke all: enumerated revoked_session_ids includes sessionB",
      respAll.revoked_session_ids.some((id) => id === sessionB.id),
    );
  }

  // Concluding checks
  TestValidator.predicate(
    "final: revoke-by-ids consistent",
    respByIds.revoked_count >= 0,
  );
  TestValidator.predicate(
    "final: revoke-all consistent",
    respAll.revoked_count >= 0,
  );
}
