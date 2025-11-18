import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

export async function test_api_user_registration(connection: api.IConnection) {
  // Generate valid test data using DTO schema constraints
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphabets(12);
  const href = typia.random<string & tags.Format<"uri">>();
  const referrer = typia.random<string & tags.Format<"uri">>();

  // Execute user registration with valid data
  const user: ITodoListUser.IAuthorized = await api.functional.auth.user.join(
    connection,
    {
      body: {
        email,
        password,
        href,
        referrer,
      } satisfies ITodoListUser.ICreate,
    },
  );

  // Validate the response structure and types - typia.assert() validates everything
  typia.assert(user);

  // Validate business logic: email in response matches input
  TestValidator.equals("user email matches input", user.email, email);

  // Validate that authentication token was returned and contains required fields
  TestValidator.equals("access token exists", Boolean(user.token.access), true);
  TestValidator.equals(
    "refresh token exists",
    Boolean(user.token.refresh),
    true,
  );

  // Validate that timestamp fields exist and are non-null
  TestValidator.predicate(
    "created_at is present",
    user.created_at !== undefined,
  );
}
