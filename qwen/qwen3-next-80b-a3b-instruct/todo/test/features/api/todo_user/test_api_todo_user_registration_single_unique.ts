import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoUser";

/**
 * Validate unique user registration scenario for strict GDPR-compliant minimal
 * footprint accounts.
 *
 * 1. Generate a unique, RFC 5322 compliant email address and valid password.
 * 2. Prepare required session context: href, referrer (all random valid URIs),
 *    occasionally test with and without the optional 'ip' field.
 * 3. Submit registration to /auth/user/join.
 * 4. Assert:
 *
 *    - Response is a valid ITodoUser.IAuthorized according to DTO and privacy
 *         requirements
 *    - Id is a UUID, email matches input, timestamps exist & are correct, deleted_at
 *         is null or undefined
 *    - Token field is present with valid access/refresh and their expiries
 *    - Sensitive authentication fields (password, password hash) and non-essential
 *         metadata are NOT present
 * 5. Optionally test duplicate registration with same email is rejected.
 */
export async function test_api_todo_user_registration_single_unique(
  connection: api.IConnection,
) {
  // 1. Generate registration body with unique information
  const uniqueEmail = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(12);
  const href = typia.random<string & tags.Format<"uri">>();
  const referrer = typia.random<string & tags.Format<"uri">>();

  // Optionally test with and without ip field
  const registrationBodies: ITodoUser.IJoin[] = [
    { email: uniqueEmail, password, href, referrer },
    {
      email: uniqueEmail,
      password,
      href,
      referrer,
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  ];
  for (const registration of registrationBodies) {
    // 2. POST /auth/user/join
    const result: ITodoUser.IAuthorized = await api.functional.auth.user.join(
      connection,
      { body: registration },
    );
    // 3. Assert primary structure
    typia.assert(result);
    TestValidator.equals(
      "response email matches input",
      result.email,
      uniqueEmail,
    );
    TestValidator.predicate(
      "user id is valid UUID",
      typeof result.id === "string" &&
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
          result.id,
        ),
    );
    TestValidator.predicate(
      "created_at is ISO8601 string",
      typeof result.created_at === "string" &&
        /\d{4}-\d{2}-\d{2}T/.test(result.created_at),
    );
    TestValidator.equals(
      "deleted_at absent or null",
      result.deleted_at ?? null,
      null,
    );
    // 4. Assert presence of valid token structure
    typia.assert(result.token);
    TestValidator.predicate(
      "token.access is string",
      typeof result.token.access === "string",
    );
    TestValidator.predicate(
      "token.refresh is string",
      typeof result.token.refresh === "string",
    );
    TestValidator.predicate(
      "token.expired_at is ISO8601",
      /\d{4}-\d{2}-\d{2}T/.test(result.token.expired_at),
    );
    TestValidator.predicate(
      "token.refreshable_until is ISO8601",
      /\d{4}-\d{2}-\d{2}T/.test(result.token.refreshable_until),
    );
    // 5. Assert password/sensitive fields do NOT exist in response (privacy)
    TestValidator.predicate(
      "no raw password in response",
      !("password" in (result as any)),
    );
    TestValidator.predicate(
      "no password hash in response",
      !("password_hash" in (result as any)),
    );
    TestValidator.predicate(
      "no profile/extra fields in response",
      !("profile" in (result as any)) && !("username" in (result as any)),
    );
  }
  // 6. Attempt duplicate registration, expect error
  await TestValidator.error("duplicate registration rejected", async () => {
    await api.functional.auth.user.join(connection, {
      body: { email: uniqueEmail, password, href, referrer },
    });
  });
}
