import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

export async function test_api_user_registration_duplicate_email(
  connection: api.IConnection,
) {
  // Generate a random email address for the first user
  const email: string = typia.random<string & tags.Format<"email">>();

  // Register the first user with the generated email
  const firstUser: ITodoListUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: {
        email: email,
        password: "password123",
      } satisfies ITodoListUser.ICreate,
    });
  typia.assert(firstUser);

  // Attempt to register a second user with the same email
  await TestValidator.error("duplicate email should fail", async () => {
    await api.functional.auth.user.join(connection, {
      body: {
        email: email, // Use the same email as the first user
        password: "password456",
      } satisfies ITodoListUser.ICreate,
    });
  });

  // Verify that the second user was not created
  // This step is implicit in the TestValidator.error test above
  // If the error test passes, it confirms the duplicate email was rejected
}
