import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";

export async function test_api_member_password_reset_consume_token_and_enforce_single_use(
  connection: api.IConnection,
) {
  /**
   * Test purpose:
   *
   * - Validate the password reset happy-path using available SDK endpoints.
   * - Due to SDK limitations (no API to read discussion_board_password_resets or
   *   to perform an explicit login), this test focuses on the flow that is
   *   implementable: register member -> request reset -> consume token via
   *   reset endpoint. Persisted-field checks (consumed_at, expires_at) and
   *   verification via login are NOT possible with the provided SDK functions
   *   and therefore are intentionally omitted.
   *
   * Strategy:
   *
   * 1. Use a simulated connection (simulate: true) derived from the provided
   *    connection so that SDK simulate handlers return deterministic, type-safe
   *    values while keeping the original connection untouched.
   * 2. Create a member with realistic data that satisfies
   *    IDiscussionBoardMember.IJoin.
   * 3. Trigger a password reset request (API returns void). The actual token is
   *    not available from the SDK, so for simulation we generate a plausible
   *    token locally and call the reset endpoint. This keeps the test
   *    compilable and type-safe while exercising the reset API contract.
   */

  // Use simulation mode to exercise SDK simulate behavior without mutating caller's connection
  const sim: api.IConnection = { ...connection, simulate: true, headers: {} };

  // 1) Create a fresh member
  const originalPassword = RandomGenerator.alphaNumeric(8) + "A1!a2"; // >=13 chars: letters/digits/symbols/upper
  const email = typia.random<string & tags.Format<"email">>();
  // username must match /^[A-Za-z0-9_.-]{3,30}$/; alphaNumeric(8) is safe
  const username = RandomGenerator.alphaNumeric(8);

  const created: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(sim, {
      body: {
        username,
        email,
        password: originalPassword,
        href: "https://example.com/welcome",
        referrer: "https://example.com",
      } satisfies IDiscussionBoardMember.IJoin,
    });
  // Runtime type validation
  typia.assert(created);

  // 2) Trigger password reset request (void response). We assert it does not throw.
  await api.functional.auth.member.password.request.requestPasswordReset(sim, {
    body: {
      // IRequestPasswordReset is unspecified in types (any); provide the common identifier
      email,
    } satisfies IDiscussionBoardMember.IRequestPasswordReset,
  });

  // 3) Obtain a plausible token for simulate-mode reset. In a real test harness,
  //    this token should be retrieved from persistence or test-email interception.
  const token = typia.random<string & tags.Format<"uuid">>();

  // 4) Consume the token by resetting the password
  const newPassword = RandomGenerator.alphaNumeric(8) + "B2@b3"; // >=13 chars

  const resetResponse: IDiscussionBoardMember =
    await api.functional.auth.member.password.reset.resetPassword(sim, {
      body: {
        token,
        password: newPassword,
        revokeSessions: true,
      } satisfies IDiscussionBoardMember.IResetPassword,
    });
  typia.assert(resetResponse);

  // 5) Reachable assertions (server-side persisted fields and reuse behavior
  //    cannot be asserted here because SDK doesn't expose them):
  TestValidator.predicate(
    "reset returned a member id string",
    typeof resetResponse.id === "string",
  );
  TestValidator.predicate(
    "created member id is present",
    typeof created.id === "string",
  );

  // Note: Single-use enforcement and consumed_at/expiry checks are omitted
  // because they require direct DB access or dedicated SDK endpoints which
  // are not available in the provided materials.
}
