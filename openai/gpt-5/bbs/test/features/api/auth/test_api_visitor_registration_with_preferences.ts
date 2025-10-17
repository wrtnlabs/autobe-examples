import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconDiscussVisitor } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussVisitor";
import type { IEconDiscussVisitorJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussVisitorJoin";

/**
 * Validate Visitor registration with optional preferences and token semantics.
 *
 * This test covers the happy-path onboarding for a Visitor account via POST
 * /auth/visitor/join and verifies:
 *
 * 1. Successful registration with preferences (timezone, locale)
 * 2. Authorization payload issuance (access/refresh tokens) and non-empty values
 * 3. Token timestamps are ISO strings (via typia.assert) and logically consistent
 *
 *    - Expired_at and refreshable_until parse as valid dates
 *    - Both are in the future relative to now
 *    - Refreshable_until >= expired_at
 * 4. A second registration with a distinct email also succeeds and returns a
 *    different user id
 * 5. Re-registering with an already used email fails (generic error assertion)
 *
 * Notes and constraints:
 *
 * - Only IEconDiscussVisitorJoin.ICreate and IEconDiscussVisitor.IAuthorized are
 *   used.
 * - No inspection of claims/roles beyond available DTOs.
 * - No status-code assertions; typia.assert ensures structure, TestValidator
 *   ensures business predicates.
 */
export async function test_api_visitor_registration_with_preferences(
  connection: api.IConnection,
) {
  // 1) Prepare first registration payload with preferences
  const email1 = typia.random<string & tags.Format<"email">>();
  const password1 = RandomGenerator.alphaNumeric(12); // >= 8 chars
  const displayName1 = RandomGenerator.name(1); // at least 1 char

  const joinBody1 = {
    email: email1,
    password: password1,
    display_name: displayName1,
    timezone: "Asia/Seoul",
    locale: "en-US",
  } satisfies IEconDiscussVisitorJoin.ICreate;

  // 2) Register (with preferences) and validate response structure
  const auth1 = await api.functional.auth.visitor.join(connection, {
    body: joinBody1,
  });
  typia.assert(auth1); // IEconDiscussVisitor.IAuthorized

  // 3) Business assertions on token fields
  TestValidator.predicate(
    "access token should be a non-empty string",
    auth1.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token should be a non-empty string",
    auth1.token.refresh.length > 0,
  );

  const now = Date.now();
  const accessExp1 = Date.parse(auth1.token.expired_at);
  const refreshUntil1 = Date.parse(auth1.token.refreshable_until);
  TestValidator.predicate(
    "access token expiration should parse to a valid timestamp",
    Number.isFinite(accessExp1),
  );
  TestValidator.predicate(
    "refreshable_until should parse to a valid timestamp",
    Number.isFinite(refreshUntil1),
  );
  TestValidator.predicate(
    "access token expiration should be in the future",
    accessExp1 > now,
  );
  TestValidator.predicate(
    "refresh window should be at or after access expiration",
    refreshUntil1 >= accessExp1,
  );

  // 4) Second registration with unique email (omitting optional preferences)
  const email2 = typia.random<string & tags.Format<"email">>();
  const joinBody2 = {
    email: email2,
    password: RandomGenerator.alphaNumeric(12),
    display_name: RandomGenerator.name(1),
  } satisfies IEconDiscussVisitorJoin.ICreate;

  const auth2 = await api.functional.auth.visitor.join(connection, {
    body: joinBody2,
  });
  typia.assert(auth2);

  // Distinct user ids across registrations
  TestValidator.notEquals(
    "second registration should yield a different user id",
    auth2.id,
    auth1.id,
  );

  // 5) Negative case: duplicate email should fail
  await TestValidator.error(
    "duplicate email registration should be rejected",
    async () => {
      await api.functional.auth.visitor.join(connection, {
        body: joinBody1,
      });
    },
  );
}
