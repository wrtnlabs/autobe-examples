import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAuthorizationToken";

/**
 * Test the successful registration of a new administrator.
 *
 * This test validates that an admin can register with a unique, valid email
 * address and a strong password (min 8 chars, must contain both alphabet,
 * numbers, and special characters), including required session/audit context.
 * Ensures that business rules are enforced: is_active = true, is_email_verified
 * = false, is_blocked = false at creation. Also ensures that the response
 * contains an authorized session (IDiscussionBoardAdmin.IAuthorized), including
 * UUID id, JWT token, and audit fields, and that a new admin session is
 * immediately available for platform authentication.
 *
 * Steps:
 *
 * 1. Generate valid random email, strong password, unique context URIs (href,
 *    referrer)
 * 2. Call the /auth/admin/join endpoint to request admin registration
 * 3. Validate the response: proper type, correct admin fields (status, audit)
 * 4. Confirm returned JWT authorization tokens are present, within
 *    IDiscussionBoardAuthorizationToken structure
 * 5. Confirm is_active is true, is_email_verified is false, is_blocked is false
 */
export async function test_api_admin_registration_successful(
  connection: api.IConnection,
) {
  // 1. Test data preparation: unique valid email, policy-compliant password, context URIs
  const email = typia.random<string & tags.Format<"email">>();
  // Password at least 8 chars, alpha, numeric, and special (mix RandomGenerator.alphaNumeric and special chars)
  const alphaNum = RandomGenerator.alphaNumeric(8);
  const specials = "!@$%&*_+?#";
  const password =
    alphaNum.substring(0, 4) +
    RandomGenerator.pick([...specials]) +
    alphaNum.substring(4) +
    RandomGenerator.pick([...specials]) +
    "A1";
  const href =
    "https://admin.example.com/registration/start/" +
    RandomGenerator.alphaNumeric(6);
  const referrer =
    "https://platform.example.com/landing?utm=" +
    RandomGenerator.alphaNumeric(3);
  const requestBody = {
    email,
    password: password satisfies string & tags.MinLength<8>,
    href: href satisfies string & tags.Format<"uri">,
    referrer: referrer satisfies string & tags.Format<"uri">,
  } satisfies IDiscussionBoardAdmin.IJoin;

  // 2. Register admin
  const output: IDiscussionBoardAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: requestBody,
    });
  typia.assert(output);

  // 3. Validate basic admin fields (id, email match, audit fields present)
  TestValidator.predicate(
    "admin id is a valid UUID",
    typeof output.id === "string" && output.id.length > 0,
  );
  TestValidator.equals("admin email matches input", output.email, email);
  TestValidator.equals("is_active is true", output.is_active, true);
  TestValidator.equals(
    "is_email_verified is false",
    output.is_email_verified,
    false,
  );
  TestValidator.equals("is_blocked is false", output.is_blocked, false);
  TestValidator.predicate(
    "created_at is present",
    typeof output.created_at === "string" && output.created_at.length > 0,
  );
  TestValidator.predicate(
    "updated_at is present",
    typeof output.updated_at === "string" && output.updated_at.length > 0,
  );
  TestValidator.equals(
    "deleted_at is null or undefined",
    output.deleted_at ?? null,
    null,
  );

  // 4. Confirm JWT token fields are present and type correct
  typia.assert<IDiscussionBoardAuthorizationToken>(output.token);
  TestValidator.predicate(
    "access token present",
    typeof output.token.access === "string" && output.token.access.length > 10,
  );
  TestValidator.predicate(
    "refresh token present",
    typeof output.token.refresh === "string" &&
      output.token.refresh.length > 10,
  );
  TestValidator.predicate(
    "expired_at is ISO8601 string",
    typeof output.token.expired_at === "string" &&
      output.token.expired_at.length > 0,
  );
  TestValidator.predicate(
    "refreshable_until is ISO8601 string",
    typeof output.token.refreshable_until === "string" &&
      output.token.refreshable_until.length > 0,
  );
}
