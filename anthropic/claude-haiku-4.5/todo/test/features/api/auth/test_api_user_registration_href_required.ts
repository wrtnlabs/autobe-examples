import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ITodoListTokenBlacklist } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTokenBlacklist";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

export async function test_api_user_registration_href_required(
  connection: api.IConnection,
) {
  // Test 1: Successful registration with valid href containing standard web URL
  const validEmail1 = typia.random<string & tags.Format<"email">>();
  const validPassword1 = RandomGenerator.alphabets(10);
  const validHref1 = "https://example.com/register";
  const validReferrer1 = "https://example.com";

  const registerData1 = {
    email: validEmail1,
    password: validPassword1,
    href: validHref1,
    referrer: validReferrer1,
  } satisfies ITodoListUser.ICreate;

  const authorizedUser1 = await api.functional.auth.user.join(connection, {
    body: registerData1,
  });

  typia.assert(authorizedUser1);
  TestValidator.equals(
    "registered user email matches input",
    authorizedUser1.email,
    validEmail1,
  );
  TestValidator.predicate(
    "user has valid token after registration",
    authorizedUser1.token.access.length > 0,
  );

  // Test 2: Successful registration with href containing alternative URI format
  const validEmail2 = typia.random<string & tags.Format<"email">>();
  const validPassword2 = RandomGenerator.alphabets(10);
  const validHref2 = "http://localhost:3000/auth/join";
  const validReferrer2 = "http://localhost:3000";

  const registerData2 = {
    email: validEmail2,
    password: validPassword2,
    href: validHref2,
    referrer: validReferrer2,
  } satisfies ITodoListUser.ICreate;

  const authorizedUser2 = await api.functional.auth.user.join(connection, {
    body: registerData2,
  });

  typia.assert(authorizedUser2);
  TestValidator.equals(
    "second user email matches input",
    authorizedUser2.email,
    validEmail2,
  );

  // Test 3: Verify different href values are accepted in registration
  const validEmail3 = typia.random<string & tags.Format<"email">>();
  const validPassword3 = RandomGenerator.alphabets(10);
  const validHref3 = "https://api.example.org/auth/register";
  const validReferrer3 = "https://example.org";

  const registerData3 = {
    email: validEmail3,
    password: validPassword3,
    href: validHref3,
    referrer: validReferrer3,
  } satisfies ITodoListUser.ICreate;

  const authorizedUser3 = await api.functional.auth.user.join(connection, {
    body: registerData3,
  });

  typia.assert(authorizedUser3);
  TestValidator.equals(
    "third user email matches input",
    authorizedUser3.email,
    validEmail3,
  );
  TestValidator.notEquals(
    "different users should have different IDs",
    authorizedUser1.id,
    authorizedUser3.id,
  );
}
