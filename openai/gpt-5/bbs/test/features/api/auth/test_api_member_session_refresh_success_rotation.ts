import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconDiscussMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussMember";

/**
 * Validate member refresh-token flow with rotation tolerance and negative
 * paths.
 *
 * Steps
 *
 * 1. Join a new member to obtain initial access/refresh tokens
 * 2. Refresh with the valid refresh token (using a clean unauthenticated
 *    connection)
 * 3. Check rotation semantics by attempting to reuse the old refresh token
 * 4. Refresh again using the latest refresh token
 * 5. Negative: forged token should be rejected (error thrown)
 */
export async function test_api_member_session_refresh_success_rotation(
  connection: api.IConnection,
) {
  // 1) Join a new member
  const email: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const password: string & tags.MinLength<8> = typia.random<
    string & tags.MinLength<8>
  >();
  const display = RandomGenerator.name(1);

  const joinBody = {
    email,
    password,
    display_name: display,
    timezone: "Asia/Seoul",
    locale: "en-US",
  } satisfies IEconDiscussMember.ICreate;

  const joined: IEconDiscussMember.IAuthorized =
    await api.functional.auth.member.join(connection, { body: joinBody });
  typia.assert(joined);

  // Basic identity assertions
  if (joined.member) {
    TestValidator.equals(
      "subject.id equals authorized.id",
      joined.member.id,
      joined.id,
    );
  }

  const initialAccess: string = joined.token.access;
  const initialRefresh: string = joined.token.refresh;

  // 2) Refresh using only the refresh token (no bearer). Create unauthenticated connection clone once and do not touch headers afterwards.
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  const refreshBody1 = {
    refresh_token: initialRefresh,
  } satisfies IEconDiscussMember.IRefresh;

  const refreshed1: IEconDiscussMember.IAuthorized =
    await api.functional.auth.member.refresh(unauthConn, {
      body: refreshBody1,
    });
  typia.assert(refreshed1);

  // Identity must remain consistent
  TestValidator.equals(
    "refresh keeps same member id",
    refreshed1.id,
    joined.id,
  );

  // Access token should change on refresh (at least access rotates)
  TestValidator.notEquals(
    "access token is rotated on refresh",
    refreshed1.token.access,
    initialAccess,
  );

  // 3) Rotation semantics: try reusing the OLD refresh token again
  let rotated: boolean = false;
  try {
    const reuseOld = {
      refresh_token: initialRefresh,
    } satisfies IEconDiscussMember.IRefresh;
    const maybe: IEconDiscussMember.IAuthorized =
      await api.functional.auth.member.refresh(connection, { body: reuseOld });
    typia.assert(maybe);
    // If succeeded, tokens are still usable; continue below.
  } catch {
    rotated = true; // Old token invalidated by rotation-on-use policy
  }

  // Regardless of rotation policy, refreshing with the latest refresh token must work
  const refreshBody2 = {
    refresh_token: refreshed1.token.refresh,
  } satisfies IEconDiscussMember.IRefresh;
  const refreshed2: IEconDiscussMember.IAuthorized =
    await api.functional.auth.member.refresh(connection, {
      body: refreshBody2,
    });
  typia.assert(refreshed2);
  TestValidator.equals(
    "second refresh keeps same member id",
    refreshed2.id,
    joined.id,
  );

  // 4) Negative: forged but well-formed token (length >= 20) should be rejected
  const forgedToken: string = RandomGenerator.alphaNumeric(32);
  await TestValidator.error(
    "forged refresh token must be rejected",
    async () => {
      const forgedBody = {
        refresh_token: forgedToken,
      } satisfies IEconDiscussMember.IRefresh;
      await api.functional.auth.member.refresh(connection, {
        body: forgedBody,
      });
    },
  );
}
