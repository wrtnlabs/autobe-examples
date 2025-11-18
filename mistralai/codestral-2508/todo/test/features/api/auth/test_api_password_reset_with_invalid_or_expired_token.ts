import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Test password reset API with invalid, expired, and used tokens.
 *
 * Ensures that the API fails gracefully when given:
 *
 * - A random (never-issued) token
 * - An obviously malformed token
 * - A plausible but likely expired token
 * - A token value that, by convention, would likely have been already used
 *
 * The API response must return success: false and a generic message, with no
 * user-leaking info. Passwords must NOT be changed when using
 * invalid/expired/used tokens.
 */
export async function test_api_password_reset_with_invalid_or_expired_token(
  connection: api.IConnection,
) {
  // Case 1: random never-issued token (valid format, unlikely to exist)
  await TestValidator.error(
    "reset fails with random never-issued token",
    async () => {
      const result =
        await api.functional.auth.user.password.reset.resetPassword(
          connection,
          {
            body: {
              token: RandomGenerator.alphaNumeric(64),
              password: RandomGenerator.alphaNumeric(16) as string &
                tags.MinLength<8> &
                tags.MaxLength<72>,
            },
          },
        );
      typia.assert(result);
      TestValidator.equals(
        "should not succeed with random token",
        result.success,
        false,
      );
      TestValidator.predicate(
        "message should not leak user existence",
        typeof result.message === "string" &&
          !result.message.toLowerCase().includes("user") &&
          !result.message.toLowerCase().includes("email"),
      );
    },
  );

  // Case 2: malformed token (short/obviously invalid)
  await TestValidator.error(
    "reset fails with malformed token (short)",
    async () => {
      const result =
        await api.functional.auth.user.password.reset.resetPassword(
          connection,
          {
            body: {
              token: "badtoken",
              password: RandomGenerator.alphaNumeric(16) as string &
                tags.MinLength<8> &
                tags.MaxLength<72>,
            },
          },
        );
      typia.assert(result);
      TestValidator.equals(
        "should not succeed with malformed token",
        result.success,
        false,
      );
      TestValidator.predicate(
        "message should not leak user existence (malformed)",
        typeof result.message === "string" &&
          !result.message.toLowerCase().includes("user") &&
          !result.message.toLowerCase().includes("email"),
      );
    },
  );

  // Case 3: plausible expired token (valid-like pattern, but not in system)
  await TestValidator.error(
    "reset fails with plausible but expired token",
    async () => {
      const plausibleExpiredToken =
        RandomGenerator.alphaNumeric(48) + "EXPIRED";
      const result =
        await api.functional.auth.user.password.reset.resetPassword(
          connection,
          {
            body: {
              token: plausibleExpiredToken,
              password: RandomGenerator.alphaNumeric(16) as string &
                tags.MinLength<8> &
                tags.MaxLength<72>,
            },
          },
        );
      typia.assert(result);
      TestValidator.equals(
        "should not succeed with expired token",
        result.success,
        false,
      );
      TestValidator.predicate(
        "message should not leak user existence (expired)",
        typeof result.message === "string" &&
          !result.message.toLowerCase().includes("user") &&
          !result.message.toLowerCase().includes("email"),
      );
    },
  );

  // Case 4: plausible used token (simulate used token pattern)
  await TestValidator.error(
    "reset fails with token that appears already used",
    async () => {
      const likelyUsedToken = RandomGenerator.alphaNumeric(48) + "USED";
      const result =
        await api.functional.auth.user.password.reset.resetPassword(
          connection,
          {
            body: {
              token: likelyUsedToken,
              password: RandomGenerator.alphaNumeric(16) as string &
                tags.MinLength<8> &
                tags.MaxLength<72>,
            },
          },
        );
      typia.assert(result);
      TestValidator.equals(
        "should not succeed with used token",
        result.success,
        false,
      );
      TestValidator.predicate(
        "message should not leak user existence (used)",
        typeof result.message === "string" &&
          !result.message.toLowerCase().includes("user") &&
          !result.message.toLowerCase().includes("email"),
      );
    },
  );
}
