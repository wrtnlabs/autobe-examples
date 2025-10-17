import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityModerator";
import type { ICommunityPlatformCommunityModeratorJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityModeratorJoin";

export async function test_api_community_moderator_registration_success(
  connection: api.IConnection,
) {
  /**
   * Validate community moderator registration success and token issuance.
   *
   * Steps:
   *
   * 1. Build unique, compliant registration payload
   * 2. Join without prior authentication (empty headers)
   * 3. Assert response typing and business expectations
   * 4. Re-attempt join with same identifiers and expect error
   */

  // 0) Prepare unauthenticated connection (do not touch headers afterward)
  const unauthConn: api.IConnection = { ...connection, headers: {} };

  // Helpers to generate compliant username/password
  const letters = [
    ..."ABCDEFGHIJKLMNOPQRSTUVWXYZ",
    ..."abcdefghijklmnopqrstuvwxyz",
  ];
  const digits = [..."0123456789"];
  const allowedUsernameChars = [...letters, ...digits, "_"];

  const usernameLength = typia.random<
    number & tags.Type<"uint32"> & tags.Minimum<3> & tags.Maximum<20>
  >();
  let username = "";
  for (let i = 0; i < usernameLength; i++)
    username += RandomGenerator.pick(allowedUsernameChars);

  const passwordLength = typia.random<
    number & tags.Type<"uint32"> & tags.Minimum<8> & tags.Maximum<16>
  >();
  const passwordChars: string[] = [];
  // ensure at least one letter and one digit
  passwordChars.push(RandomGenerator.pick(letters));
  passwordChars.push(RandomGenerator.pick(digits));
  const pool = [...letters, ...digits];
  for (let i = 2; i < passwordLength; i++)
    passwordChars.push(RandomGenerator.pick(pool));
  const password = passwordChars.join("");

  const nowIso = new Date().toISOString();

  // 1) Build request body with all required fields (and optional marketing consent)
  const body = {
    email: typia.random<string & tags.Format<"email">>(),
    username,
    password,
    terms_accepted_at: nowIso,
    privacy_accepted_at: nowIso,
    marketing_opt_in: true,
    marketing_opt_in_at: nowIso,
  } satisfies ICommunityPlatformCommunityModeratorJoin.ICreate;

  // 2) Call join without prior authentication
  const authorized: ICommunityPlatformCommunityModerator.IAuthorized =
    await api.functional.auth.communityModerator.join(unauthConn, {
      body,
    });

  // 3) Validate response typing and business logic
  typia.assert(authorized);

  // token presence
  TestValidator.predicate(
    "access token is issued",
    authorized.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token is issued",
    authorized.token.refresh.length > 0,
  );

  // token time relationship (refresh should not precede access expiry)
  const expiredAt = Date.parse(authorized.token.expired_at);
  const refreshableUntil = Date.parse(authorized.token.refreshable_until);
  TestValidator.predicate(
    "refreshable_until is later than or equal to expired_at",
    refreshableUntil >= expiredAt,
  );

  // role semantics: if present, it must equal communityModerator
  if (authorized.role !== undefined) {
    TestValidator.equals(
      "role is communityModerator when present",
      authorized.role,
      "communityModerator",
    );
  }

  // ensure no plaintext password exposure in top-level response
  const responseKeys = Object.keys(authorized);
  TestValidator.predicate(
    "response does not expose plaintext password",
    responseKeys.includes("password") === false,
  );

  // 4) Duplicate registration must fail (uniqueness on email/username)
  await TestValidator.error(
    "duplicate identifiers must be rejected",
    async () => {
      await api.functional.auth.communityModerator.join(unauthConn, {
        body,
      });
    },
  );
}
