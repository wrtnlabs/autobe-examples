import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IEconPoliticalForumRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumRegisteredUser";

export async function test_api_registereduser_password_request_reset_nonexistent_email(
  connection: api.IConnection,
) {
  // Generate a unique, syntactically valid email that is extremely unlikely
  // to exist in the test system. Use alphanumeric local-part to reduce
  // collision chance in shared test databases.
  const testEmail = `${RandomGenerator.alphaNumeric(8)}@example.com`;

  // Construct request body using "satisfies" pattern per DTO guidance.
  const requestBody = {
    email: testEmail,
  } satisfies IEconPoliticalForumRegisteredUser.IRequestPasswordReset;

  // Call the API. Always await API calls.
  const result: IEconPoliticalForumRegisteredUser.IGenericSuccess =
    await api.functional.auth.registeredUser.password.request_reset.requestPasswordReset(
      connection,
      {
        body: requestBody,
      },
    );

  // Full runtime type validation of the response
  typia.assert(result);

  // Business-level validations:
  // 1) The endpoint must return a generic acknowledgement indicating success
  //    (do not reveal account existence). We expect success === true for the
  //    standard acknowledgement flow.
  TestValidator.equals(
    "password reset request (non-existent email) reports success",
    result.success,
    true,
  );

  // 2) If a human-readable message exists, it must not leak the provided
  //    email address (prevent account enumeration via message content).
  if (result.message !== undefined && result.message !== null) {
    TestValidator.predicate(
      "response message does not leak the requested email",
      !result.message.includes(testEmail),
    );
  }

  // NOTE: Infrastructure-level checks such as verifying no DB row is created
  // or no outgoing email enqueued are environment-specific and require DB or
  // queue access. If available, add those checks behind an environment
  // feature flag (e.g., process.env.ENABLE_DB_ASSERTS).
}
