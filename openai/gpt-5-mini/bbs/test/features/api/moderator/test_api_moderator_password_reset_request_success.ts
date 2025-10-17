import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconPoliticalForumModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumModerator";

export async function test_api_moderator_password_reset_request_success(
  connection: api.IConnection,
) {
  /**
   * Happy-path E2E test for moderator password reset request.
   *
   * Steps implemented:
   *
   * 1. Create a fresh moderator-capable account via POST /auth/moderator/join
   * 2. Call POST /auth/moderator/password/reset with that account's email
   * 3. Assert the acknowledgement response shape and business properties
   *
   * Notes:
   *
   * - This test uses only the SDK functions available in the provided materials.
   * - Direct DB and email-queue assertions are not implementable with the
   *   provided SDK and therefore are left as integration hooks (documented
   *   below) to be executed by environment-specific helpers.
   */

  // 1) Prepare unique moderator identity
  const suffix = RandomGenerator.alphaNumeric(6);
  const moderatorEmail = `moderator+reset-success-${suffix}@example.com`;
  const username = `mod_${RandomGenerator.alphaNumeric(6)}`;

  // 2) Create moderator-capable registered user
  const joinBody = {
    username,
    email: moderatorEmail,
    password: "Str0ngPass!23",
    display_name: RandomGenerator.name(),
  } satisfies IEconPoliticalForumModerator.ICreate;

  const authorized: IEconPoliticalForumModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: joinBody,
    });
  // Validate response shape
  typia.assert(authorized);

  // Basic business assertions on join result
  TestValidator.predicate(
    "authorized: token.access present",
    typeof authorized.token?.access === "string" &&
      authorized.token.access.length > 0,
  );
  TestValidator.predicate(
    "authorized: id looks present",
    typeof authorized.id === "string" && authorized.id.length > 0,
  );

  // 3) Request password reset using the moderator's email
  const resetBody = {
    email: moderatorEmail,
  } satisfies IEconPoliticalForumModerator.IPasswordResetRequest;

  const ack: IEconPoliticalForumModerator.IPasswordResetRequestAck =
    await api.functional.auth.moderator.password.reset.requestPasswordReset(
      connection,
      {
        body: resetBody,
      },
    );
  typia.assert(ack);

  // Business assertions on acknowledgement
  TestValidator.predicate(
    "password reset acknowledgement: success is true",
    ack.success === true,
  );

  TestValidator.predicate(
    "password reset acknowledgement: message is non-empty",
    typeof ack.message === "string" && ack.message.trim().length > 0,
  );

  // Integration hooks (NOT executed here - for environment-specific helpers):
  // - Verify a new row in econ_political_forum_password_resets exists referencing the
  //   created registereduser.id with used === false and expires_at in the future.
  // - Verify that an email send was enqueued (or mailer mock received a send job)
  //   and that it references the reset record (do NOT assert raw token presence).
  // These checks require direct DB access or mailer-queue inspection and should
  // be implemented using test environment helpers (e.g., test DB client, mail
  // queue inspector) available in CI or local test harness.
}
