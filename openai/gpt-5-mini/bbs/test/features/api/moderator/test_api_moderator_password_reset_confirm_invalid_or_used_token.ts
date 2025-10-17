import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconPoliticalForumModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumModerator";

export async function test_api_moderator_password_reset_confirm_invalid_or_used_token(
  connection: api.IConnection,
) {
  /**
   * Purpose
   *
   * - Validate that POST /auth/moderator/password/confirm rejects invalid,
   *   expired or reused tokens.
   *
   * Notes about limitations
   *
   * - The public SDK does not expose test helpers to capture the actual one-time
   *   token delivered by email nor direct DB access to manipulate
   *   password_reset records. Therefore this test verifies rejection of
   *   unknown/invalid tokens and repeated attempts with the same token string.
   * - For full fidelity tests (consume a real token successfully then verify
   *   reuse fails, or set expires_at in DB), add harness utilities such as:
   *
   *   - A mocked-email capture endpoint/test helper
   *   - DB test helper to read/mutate econ_political_forum_password_resets
   *   - Test-only audit-log reader
   */

  // 1) Create moderator account
  const moderatorEmail: string = typia.random<string & tags.Format<"email">>();
  const moderatorUsername: string = RandomGenerator.alphaNumeric(8);
  const initialPassword = "InitialPass123!";

  const created: IEconPoliticalForumModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        username: moderatorUsername,
        email: moderatorEmail,
        password: initialPassword,
        display_name: RandomGenerator.name(),
      } satisfies IEconPoliticalForumModerator.ICreate,
    });
  typia.assert(created);

  // 2) Request password reset for created moderator
  const resetAck: IEconPoliticalForumModerator.IPasswordResetRequestAck =
    await api.functional.auth.moderator.password.reset.requestPasswordReset(
      connection,
      {
        body: {
          email: moderatorEmail,
        } satisfies IEconPoliticalForumModerator.IPasswordResetRequest,
      },
    );
  typia.assert(resetAck);

  // Confirm ack fields are present (typia.assert already validated structure)
  TestValidator.predicate(
    "password reset request acknowledged (boolean)",
    typeof resetAck.success === "boolean",
  );

  // 3) INVALID token: try a random token string not issued by server
  const invalidToken = RandomGenerator.alphaNumeric(24);
  await TestValidator.error(
    "confirm should fail for invalid token",
    async () => {
      await api.functional.auth.moderator.password.confirm.confirmPasswordReset(
        connection,
        {
          body: {
            token: invalidToken,
            new_password: "NewPassword#1A",
          } satisfies IEconPoliticalForumModerator.IPasswordResetConfirm,
        },
      );
    },
  );

  // 4) EXPIRED token (practical): simulate by using another unknown token
  // NOTE: To truly test 'expired', harness must provide ability to (a) fetch the
  // real token issued to e-mail or (b) set expires_at in DB to the past. Here
  // we assert that an additional unknown token is also rejected.
  const expiredLikeToken = RandomGenerator.alphaNumeric(24);
  await TestValidator.error(
    "confirm should fail for expired or invalid token",
    async () => {
      await api.functional.auth.moderator.password.confirm.confirmPasswordReset(
        connection,
        {
          body: {
            token: expiredLikeToken,
            new_password: "AnotherNew#2B",
          } satisfies IEconPoliticalForumModerator.IPasswordResetConfirm,
        },
      );
    },
  );

  // 5) REUSE token (practical): attempt confirm twice with the same token string
  // Because we do not have the real issued token, both attempts with an
  // unissued token should fail. When harness exposes the real token, replace
  // this block with: (a) confirm(realToken) -> success, (b) confirm(realToken) -> fail.
  const reuseToken = RandomGenerator.alphaNumeric(28);

  await TestValidator.error(
    "first confirm attempt with same unknown token should fail",
    async () => {
      await api.functional.auth.moderator.password.confirm.confirmPasswordReset(
        connection,
        {
          body: {
            token: reuseToken,
            new_password: "ReusePass#123",
          } satisfies IEconPoliticalForumModerator.IPasswordResetConfirm,
        },
      );
    },
  );

  await TestValidator.error(
    "second confirm attempt with same unknown token should also fail",
    async () => {
      await api.functional.auth.moderator.password.confirm.confirmPasswordReset(
        connection,
        {
          body: {
            token: reuseToken,
            new_password: "ReusePass#123",
          } satisfies IEconPoliticalForumModerator.IPasswordResetConfirm,
        },
      );
    },
  );

  // 6) Audit note: SDK has no audit-log reader. Recommend adding a test helper
  // to fetch audit logs to assert that failed token attempts and successful
  // resets are recorded. For now, assert resetAck.message exists as a string.
  TestValidator.predicate(
    "reset ack message is a string",
    typeof resetAck.message === "string",
  );

  // End of test. Cleanup should be handled by test harness (DB reset or cleanup endpoints).
}
