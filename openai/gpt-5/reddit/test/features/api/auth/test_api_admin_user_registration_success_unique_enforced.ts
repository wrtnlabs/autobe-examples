import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdminUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminUser";
import type { ICommunityPlatformAdminUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminUserJoin";

/**
 * Admin registration: success and uniqueness enforcement.
 *
 * Steps:
 *
 * 1. Register a brand-new admin with unique email/username and required consents.
 *
 *    - Assert response type and basic business expectations (non-empty tokens, role
 *         when present).
 * 2. Attempt duplicate registration with the same email/username.
 *
 *    - Expect an error (conflict-like) without asserting specific status codes.
 * 3. Register another admin with a different unique (email, username).
 *
 *    - Expect success and a different principal id from the first.
 */
export async function test_api_admin_user_registration_success_unique_enforced(
  connection: api.IConnection,
) {
  // Helper: generate a password meeting policy (>=8, contains letter and digit)
  const mkPassword = (): string => {
    const letters = [
      ..."abcdefghijklmnopqrstuvwxyz",
      ..."ABCDEFGHIJKLMNOPQRSTUVWXYZ",
    ];
    const digits = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"] as const;
    const letter = RandomGenerator.pick(letters);
    const digit = RandomGenerator.pick(digits);
    const tail = RandomGenerator.alphaNumeric(10); // alnum filler
    return `${letter}${digit}${tail}`; // length >= 12, contains both kinds
  };

  // Build unique identifiers
  const email1: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const username1: string = `adm_${RandomGenerator.alphaNumeric(10)}`; // matches ^[A-Za-z0-9_]{3,20}$
  const nowIso: string & tags.Format<"date-time"> =
    new Date().toISOString() as string & tags.Format<"date-time">;

  // 1) Happy path registration
  const createBody1 = {
    email: email1,
    username: username1,
    password: mkPassword(),
    terms_accepted_at: nowIso,
    privacy_accepted_at: nowIso,
    marketing_opt_in: true,
    marketing_opt_in_at: nowIso,
  } satisfies ICommunityPlatformAdminUserJoin.ICreate;

  const first = await api.functional.auth.adminUser.join(connection, {
    body: createBody1,
  });
  typia.assert(first);

  // Business validations
  TestValidator.predicate(
    "access token present",
    first.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token present",
    first.token.refresh.length > 0,
  );
  if (first.role !== undefined) {
    TestValidator.equals(
      "role is adminUser when present",
      first.role,
      "adminUser",
    );
  }

  // 2) Duplicate attempt with same email and username should be rejected
  const dupBody = {
    email: email1,
    username: username1,
    password: mkPassword(),
    terms_accepted_at: nowIso,
    privacy_accepted_at: nowIso,
    marketing_opt_in: false,
  } satisfies ICommunityPlatformAdminUserJoin.ICreate;

  await TestValidator.error(
    "duplicate email/username must be rejected",
    async () => {
      await api.functional.auth.adminUser.join(connection, { body: dupBody });
    },
  );

  // 3) Second unique registration must still succeed
  const email2: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const username2: string = `adm_${RandomGenerator.alphaNumeric(9)}`;
  const createBody2 = {
    email: email2,
    username: username2,
    password: mkPassword(),
    terms_accepted_at: nowIso,
    privacy_accepted_at: nowIso,
  } satisfies ICommunityPlatformAdminUserJoin.ICreate;

  const second = await api.functional.auth.adminUser.join(connection, {
    body: createBody2,
  });
  typia.assert(second);

  // Confirm distinct principals
  TestValidator.notEquals(
    "second registration yields a different principal id",
    second.id,
    first.id,
  );
}
