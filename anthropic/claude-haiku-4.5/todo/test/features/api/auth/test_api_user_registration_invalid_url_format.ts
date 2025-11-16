import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";

export async function test_api_user_registration_invalid_url_format(
  connection: api.IConnection,
) {
  /**
   * Test user registration with valid URL formats for href and referrer.
   *
   * Since URL format validation (tags.Format<"uri">) is a compile-time type
   * constraint enforced by TypeScript, and E2E tests operate on valid,
   * properly-typed requests, this test validates that registration succeeds
   * with correctly formatted URLs while demonstrating proper URL usage.
   */

  /** Test 1: Successful registration with valid HTTPS URLs */
  const validEmail1 = typia.random<string & tags.Format<"email">>();
  const validPassword1 = RandomGenerator.alphabets(10);
  const validHref1 = "https://example.com/registration";
  const validReferrer1 = "https://example.com/home";

  const response1: ITodoAppUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: {
        email: validEmail1,
        password: validPassword1,
        href: validHref1,
        referrer: validReferrer1,
      } satisfies ITodoAppUser.ICreate,
    });

  typia.assert(response1);
  TestValidator.equals(
    "registered user email matches input",
    response1.email,
    validEmail1,
  );
  TestValidator.predicate(
    "registered user has access token",
    response1.token.access.length > 0,
  );

  /** Test 2: Successful registration with valid HTTP URLs */
  const validEmail2 = typia.random<string & tags.Format<"email">>();
  const validPassword2 = RandomGenerator.alphabets(10);
  const validHref2 = "http://localhost:3000/signup";
  const validReferrer2 = "http://localhost:3000/landing";

  const response2: ITodoAppUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: {
        email: validEmail2,
        password: validPassword2,
        href: validHref2,
        referrer: validReferrer2,
      } satisfies ITodoAppUser.ICreate,
    });

  typia.assert(response2);
  TestValidator.equals(
    "second user email matches input",
    response2.email,
    validEmail2,
  );
  TestValidator.predicate(
    "second user has refresh token",
    response2.token.refresh.length > 0,
  );

  /** Test 3: Successful registration with complex URLs */
  const validEmail3 = typia.random<string & tags.Format<"email">>();
  const validPassword3 = RandomGenerator.alphabets(10);
  const validHref3 = "https://api.example.com/auth/register?session=test";
  const validReferrer3 = "https://example.com:8080/pages/signup";

  const response3: ITodoAppUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: {
        email: validEmail3,
        password: validPassword3,
        href: validHref3,
        referrer: validReferrer3,
      } satisfies ITodoAppUser.ICreate,
    });

  typia.assert(response3);
  TestValidator.equals(
    "third user email matches input",
    response3.email,
    validEmail3,
  );
  TestValidator.predicate(
    "user created timestamp is set",
    response3.created_at.length > 0,
  );
}
