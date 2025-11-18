import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

export async function test_api_user_registration(connection: api.IConnection) {
  // Generate valid test user data with complexity matching requirements (minimum 12 chars, mixed case, numbers, special chars)
  const email = typia.random<string & tags.Format<"email">>();
  // Generate random password with complexity: 12-16 characters with mixed case, numbers, special characters
  const passwordChars =
    "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()";
  const password = ArrayUtil.repeat(
    typia.random<
      number & tags.Type<"uint32"> & tags.Minimum<12> & tags.Maximum<16>
    >(),
    () => RandomGenerator.pick([...passwordChars]),
  ).join("");

  // Register new user
  const result: ITodoListUser.IAuthorized = await api.functional.auth.user.join(
    connection,
    {
      body: {
        email,
        password,
      } satisfies ITodoListUser.ICreate,
    },
  );

  // Validate response structure with typia.assert (handles all type and format validation)
  typia.assert(result);

  // Validate user ID is valid UUID (assured by typia.assert and tags.Format<"uuid">)

  // Validate access token exists
  TestValidator.predicate(
    "access token is present",
    Boolean(result.token.access),
  );

  // Validate refresh token exists
  TestValidator.predicate(
    "refresh token is present",
    Boolean(result.token.refresh),
  );

  // Validate expiration timestamps are valid ISO 8601 date-time format (assured by typia.assert and tags.Format<"date-time">)

  // Verify no other fields are present in the request body - enforced by TypeScript type safety with `satisfies ITodoListUser.ICreate`

  // BCrypt hashing is performed server-side and cannot be validated client-side

  // Ensure created_at is automatically set - verified by typia.assert() asserting result contains created_at field
  // This is assured by the schema definition and typia.assert() validation
}
