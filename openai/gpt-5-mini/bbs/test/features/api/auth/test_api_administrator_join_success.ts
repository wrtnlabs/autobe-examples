import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconPoliticalForumAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumAdministrator";
import type { IEconPoliticalForumRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumRegisteredUser";

/**
 * Validate administrator registration (join) endpoint.
 *
 * Business purpose: ensure that a new administrator can be registered via POST
 * /auth/administrator/join and that the API returns a valid
 * IEconPoliticalForumAdministrator.IAuthorized payload including id and
 * authorization token container. Also ensure that the response does not leak
 * sensitive fields (e.g., password_hash) and that token fields are well-formed
 * and parseable.
 *
 * Steps:
 *
 * 1. Prepare a unique test email and a strong password satisfying password length
 *    constraints.
 * 2. Call api.functional.auth.administrator.join with a body that satisfies
 *    IEconPoliticalForumAdministrator.IJoin.
 * 3. Typia.assert() the returned IAuthorized response.
 * 4. Validate business rules using TestValidator:
 *
 *    - Tokens exist and are non-empty
 *    - Access token has JWT-like structure
 *    - Expiry timestamps parse to valid dates
 *    - Response contains id
 *    - Response JSON does not contain password_hash
 *
 * Limitations: No direct DB inspection is possible through the provided SDK.
 * DB-level assertions (presence of rows in econ_political_forum_registereduser
 * and econ_political_forum_sessions) are documented in comments for integration
 * environments with DB access but are not executed here.
 */
export async function test_api_administrator_join_success(
  connection: api.IConnection,
) {
  // 1) Build unique and valid request body
  const suffix = RandomGenerator.alphaNumeric(6);
  const email = `admin+${suffix}@example.com`;
  // Ensure password length >= 10
  const password = `${RandomGenerator.alphaNumeric(8)}A!`;
  const username = RandomGenerator.alphaNumeric(8);

  const requestBody = {
    email,
    password,
    username,
  } satisfies IEconPoliticalForumAdministrator.IJoin;

  // 2) Call the API
  const output: IEconPoliticalForumAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: requestBody,
    });

  // 3) Type-check the full response
  typia.assert(output);

  // 4) Business-level validations
  TestValidator.predicate(
    "authorized response contains id",
    typeof output.id === "string" && output.id.length > 0,
  );

  TestValidator.predicate(
    "token.access and token.refresh are non-empty strings",
    typeof output.token.access === "string" &&
      output.token.access.length > 0 &&
      typeof output.token.refresh === "string" &&
      output.token.refresh.length > 0,
  );

  // Access token should look like a JWT (three dot-separated segments)
  TestValidator.predicate(
    "access token appears to be JWT (three segments)",
    output.token.access.split(".").length === 3,
  );

  // Token expiration fields must be parseable as dates
  TestValidator.predicate(
    "token expiry fields are parseable ISO date-times",
    !Number.isNaN(Date.parse(output.token.expired_at)) &&
      !Number.isNaN(Date.parse(output.token.refreshable_until)),
  );

  // Ensure the API response doesn't leak password hashes or secrets
  TestValidator.predicate(
    "response does not leak password_hash",
    !JSON.stringify(output).includes("password_hash"),
  );

  // Optional: If the user summary is present, ensure username is reflected
  if (output.user !== undefined && output.user !== null) {
    TestValidator.equals(
      "returned user summary username matches request",
      output.user.username,
      requestBody.username,
    );
  } else {
    // If user summary is omitted (allowed by the DTO), at least id exists
    TestValidator.predicate(
      "user summary not present but id was returned",
      typeof output.id === "string" && output.id.length > 0,
    );
  }

  // NOTE: DB-level verification (registered user row created, password_hash
  // stored, sessions row created) is not possible with only the provided SDK
  // function. In an environment where the test runner has DB access (e.g., a
  // Prisma client available in the test harness), implement the following
  // additional checks in an after/cleanup step:
  //  - SELECT * FROM econ_political_forum_registereduser WHERE email = email
  //  - assert password_hash IS NOT NULL and password_hash != plain password
  //  - SELECT session row in econ_political_forum_sessions referencing that user
  //  - ensure email_verified is false and verified_at IS NULL

  // Teardown note: The test harness / CI should perform DB cleanup (rollback
  // or test DB reset) to remove the created administrator record.
}
