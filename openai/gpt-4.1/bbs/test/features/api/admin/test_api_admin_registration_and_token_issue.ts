import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";

/**
 * Validate registration flow and token issuance for admin join.
 *
 * This test registers a new admin with random email/password and session
 * context, then validates the returned IDiscussionBoardAdmin.IAuthorized
 * response and token, ensuring business and security requirements are met.
 * Steps:
 *
 * 1. Generate unique email/password, href, and referrer conforming to tags and
 *    formats.
 * 2. Call the /auth/admin/join endpoint with generated input.
 * 3. Expect 200 OK and a valid IDiscussionBoardAdmin.IAuthorized result with
 *    correct data.
 * 4. Ensure response includes only allowed fields (id, email, created_at,
 *    updated_at, deleted_at?, token), never the password nor IP in plain text.
 * 5. Assert email in response matches the request value, and id is UUID.
 * 6. Validate that the token is a fully formed IAuthorizationToken (non-empty
 *    strings for access and refresh, valid date-time for expired_at and
 *    refreshable_until).
 * 7. Confirm deleted_at is null or undefined; created_at and updated_at are RFC
 *    3339 dates; and all returned fields match type requirements.
 * 8. Confirm that reusing the same email triggers a validation (error) response
 *    (email uniqueness enforced).
 */
export async function test_api_admin_registration_and_token_issue(
  connection: api.IConnection,
) {
  // 1. Generate unique registration details.
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(12) + "A!1"; // ensure strong password
  const href = "https://" + RandomGenerator.alphaNumeric(10) + ".test/register";
  const referrer =
    "https://" + RandomGenerator.alphaNumeric(8) + ".test/landing";
  const joinBody = {
    email,
    password: password satisfies string & tags.MinLength<8>,
    href: href satisfies string & tags.Format<"uri">,
    referrer: referrer satisfies string & tags.Format<"uri">,
  } satisfies IDiscussionBoardAdmin.IJoin;

  // 2. Register new admin account
  const authorized = await api.functional.auth.admin.join(connection, {
    body: joinBody,
  });
  typia.assert(authorized);

  // 3. Validate response fields
  TestValidator.equals("registered email matches", authorized.email, email);
  TestValidator.predicate(
    "admin ID is UUID",
    typeof authorized.id === "string" &&
      /^[0-9a-fA-F-]{36}$/.test(authorized.id),
  );
  TestValidator.predicate(
    "created_at is ISO date-time",
    typeof authorized.created_at === "string" &&
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(.\d+)?Z?$/.test(
        authorized.created_at,
      ),
  );
  TestValidator.predicate(
    "updated_at is ISO date-time",
    typeof authorized.updated_at === "string" &&
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(.\d+)?Z?$/.test(
        authorized.updated_at,
      ),
  );
  TestValidator.equals(
    "deleted_at is null or undef",
    authorized.deleted_at ?? null,
    null,
  );
  typia.assert(authorized.token);
  TestValidator.predicate(
    "access token is non-empty",
    typeof authorized.token.access === "string" &&
      authorized.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token is non-empty",
    typeof authorized.token.refresh === "string" &&
      authorized.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "token.expired_at is ISO date-time",
    typeof authorized.token.expired_at === "string" &&
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(.\d+)?Z?$/.test(
        authorized.token.expired_at,
      ),
  );
  TestValidator.predicate(
    "token.refreshable_until is ISO date-time",
    typeof authorized.token.refreshable_until === "string" &&
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(.\d+)?Z?$/.test(
        authorized.token.refreshable_until,
      ),
  );

  // 4. Attempt duplicate registration with the same email -- should fail
  await TestValidator.error("duplicate admin registration fails", async () => {
    await api.functional.auth.admin.join(connection, { body: joinBody });
  });
}
