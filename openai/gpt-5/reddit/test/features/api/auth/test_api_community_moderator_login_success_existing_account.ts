import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityModerator";
import type { ICommunityPlatformCommunityModeratorJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityModeratorJoin";
import type { ICommunityPlatformCommunityModeratorLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityModeratorLogin";

/**
 * Community moderator login with existing account (happy path with idempotent
 * repeat).
 *
 * Purpose
 *
 * - Ensure that a previously registered user (member-kind identity) can login via
 *   email/password and receive IAuthorizationToken. Also validate identity
 *   consistency and successful repeated login.
 *
 * Steps
 *
 * 1. Join: create a user with valid email, username, password, and consent
 *    timestamps
 * 2. Login #1 (email + password): expect IAuthorized
 * 3. Validate identity equality between join and first login
 * 4. Login #2 (same credentials): expect success again and same identity
 * 5. Do not touch connection.headers (SDK handles tokens automatically)
 */
export async function test_api_community_moderator_login_success_existing_account(
  connection: api.IConnection,
) {
  // 1) Register a new user (join) with deterministic credentials
  const email: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const username: string = RandomGenerator.alphaNumeric(10); // satisfies ^[A-Za-z0-9_]{3,20}$
  const password: string = `A1${RandomGenerator.alphaNumeric(10)}`; // >= 8, has letters and digits
  const nowIso: string & tags.Format<"date-time"> =
    new Date().toISOString() as string & tags.Format<"date-time">;

  const joinBody = {
    email,
    username,
    password,
    terms_accepted_at: nowIso,
    privacy_accepted_at: nowIso,
    marketing_opt_in: true,
    marketing_opt_in_at: nowIso,
  } satisfies ICommunityPlatformCommunityModeratorJoin.ICreate;

  const joined: ICommunityPlatformCommunityModerator.IAuthorized =
    await api.functional.auth.communityModerator.join(connection, {
      body: joinBody,
    });
  typia.assert(joined);

  // 2) Login #1 by email + password
  const loginReq1 = {
    email,
    password,
  } satisfies ICommunityPlatformCommunityModeratorLogin.IByEmail;

  const login1: ICommunityPlatformCommunityModerator.IAuthorized =
    await api.functional.auth.communityModerator.login(connection, {
      body: loginReq1,
    });
  typia.assert(login1);

  // 3) Validate identity consistency and role optionality
  TestValidator.equals(
    "login identity equals joined identity",
    login1.id,
    joined.id,
  );
  TestValidator.predicate(
    "role is either 'communityModerator' or undefined",
    login1.role === undefined || login1.role === "communityModerator",
  );

  // 4) Login #2 (repeat) – idempotent success, same identity
  const login2: ICommunityPlatformCommunityModerator.IAuthorized =
    await api.functional.auth.communityModerator.login(connection, {
      body: loginReq1,
    });
  typia.assert(login2);
  TestValidator.equals(
    "repeated login preserves identity",
    login2.id,
    login1.id,
  );
}
