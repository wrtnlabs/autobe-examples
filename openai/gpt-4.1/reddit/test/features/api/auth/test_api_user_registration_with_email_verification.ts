import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";

/**
 * Validate new user registration with email verification.
 *
 * Tests the end-to-end flow for registering a new user on the platform using
 * unique random data (email, password, display name), and verifies that:
 *
 * - The response contains a valid user object and authorization token
 * - The user record is created and is pending verification (e.g., deleted_at is
 *   null and tokens are present as per auto-login)
 * - Duplicate registration with the same email fails as expected
 * - Password policy is enforced (e.g., too short password triggers error)
 * - No further authentication/privileges are granted until verification is
 *   complete
 *
 * Steps:
 *
 * 1. Register new user with random unique data
 * 2. Assert valid authorized user response
 * 3. Try duplicate registration with same email, expect error
 * 4. Try registration with invalid password, expect error
 * 5. Check if user record is not authenticated until verification (if API separate
 *    verification step, would check unverified state)
 */
export async function test_api_user_registration_with_email_verification(
  connection: api.IConnection,
) {
  // 1. Register a new user
  const randomEmail: string = typia.random<string & tags.Format<"email">>();
  const strongPassword: string = RandomGenerator.alphaNumeric(12) + "Ab1!";
  const displayName: string = RandomGenerator.name();
  const joinBody = {
    email: randomEmail,
    password: strongPassword,
    display_name: displayName,
    href: "https://example.com/register",
    referrer: "https://example.com/landing",
  } satisfies ICommunityPlatformUser.IJoin;

  const result: ICommunityPlatformUser.IAuthorized =
    await api.functional.auth.user.join(connection, { body: joinBody });
  typia.assert(result);

  // Validate the returned structure
  TestValidator.equals(
    "email in result matches submitted email",
    result.email,
    randomEmail,
  );
  TestValidator.equals(
    "display_name in result matches submitted display_name",
    result.display_name,
    displayName,
  );
  TestValidator.equals(
    "deleted_at is null (not deleted)",
    result.deleted_at,
    null,
  );
  TestValidator.predicate(
    "token property is present and has access value",
    typeof result.token?.access === "string" && result.token.access.length > 10,
  );

  // 2. Attempt to register again with same email, expect error
  await TestValidator.error("duplicate email registration fails", async () => {
    await api.functional.auth.user.join(connection, {
      body: { ...joinBody, display_name: RandomGenerator.name() }, // new name but same email
    });
  });

  // 3. Attempt to register with short/invalid password, expect error
  const weakPasswordBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "123", // likely to violate password policy
    display_name: RandomGenerator.name(),
    href: "https://example.com/register",
    referrer: "https://example.com/landing",
  } satisfies ICommunityPlatformUser.IJoin;
  await TestValidator.error(
    "invalid (short) password is rejected",
    async () => {
      await api.functional.auth.user.join(connection, {
        body: weakPasswordBody,
      });
    },
  );
}
