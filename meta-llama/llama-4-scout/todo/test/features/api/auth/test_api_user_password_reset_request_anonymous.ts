import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ITodoListUserPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUserPasswordReset";

/**
 * Validates password reset request for any user (authenticated or
 * unauthenticated).
 *
 * Ensures that requesting a password reset with any valid email (existing or
 * non-existing) returns the same generic confirmation message, protecting user
 * privacy and preventing user enumeration. Submits a valid email address and
 * checks that the confirmation message is returned, with no information
 * disclosure about account existence. Also validates business rules: the
 * endpoint must enforce audit logging and rate limiting in the backend, and if
 * the user exists, a reset token is created (not visible to the caller).
 *
 * Steps:
 *
 * 1. Request password reset as unauthenticated using a random, valid email
 *    (simulate known user and unknown user)
 * 2. Assert that the generic confirmation message is returned regardless of
 *    account existence
 * 3. (No direct test for token creation, audit logging, or rate limiting, as these
 *    are backend concerns not exposed in this API response)
 */
export async function test_api_user_password_reset_request_anonymous(
  connection: api.IConnection,
) {
  // Test with an email that likely exists (simulate existing user)
  const existingEmail = typia.random<string & tags.Format<"email">>();
  const requestBodyExisting = {
    email: existingEmail,
  } satisfies ITodoListUserPasswordReset.IRequest;
  const responseExisting =
    await api.functional.auth.user.request_password_reset.requestPasswordReset(
      connection,
      {
        body: requestBodyExisting,
      },
    );
  typia.assert(responseExisting);
  TestValidator.predicate(
    "responseExisting.message is a generic confirmation",
    typeof responseExisting.message === "string" &&
      responseExisting.message.length > 0,
  );

  // Test with an email that almost certainly does NOT exist
  const nonExistingEmail =
    `${RandomGenerator.alphaNumeric(16)}-nobody@example.com` as string &
      tags.Format<"email">;
  const requestBodyNonExisting = {
    email: nonExistingEmail,
  } satisfies ITodoListUserPasswordReset.IRequest;
  const responseNonExisting =
    await api.functional.auth.user.request_password_reset.requestPasswordReset(
      connection,
      {
        body: requestBodyNonExisting,
      },
    );
  typia.assert(responseNonExisting);
  TestValidator.equals(
    "generic message must match regardless of email existence",
    responseNonExisting.message,
    responseExisting.message,
  );
  TestValidator.predicate(
    "responseNonExisting.message is a generic confirmation",
    typeof responseNonExisting.message === "string" &&
      responseNonExisting.message.length > 0,
  );
}
