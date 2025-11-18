import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ITodoListTokenBlacklist } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTokenBlacklist";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Test that the user profile endpoint properly rejects unauthenticated
 * requests.
 *
 * This test validates the authentication guard on the profile endpoint by
 * attempting to access it without providing a valid JWT token. The endpoint
 * should return a 401 Unauthorized error when accessed without authentication,
 * ensuring that user profile information is protected and only accessible to
 * authenticated users.
 *
 * Test flow:
 *
 * 1. Register a test user to verify the API is working (optional context)
 * 2. Create an unauthenticated connection with empty headers
 * 3. Attempt to access the profile endpoint without authentication
 * 4. Verify that the operation throws a 401 Unauthorized error
 * 5. Confirm that the error response is properly structured
 */
export async function test_api_user_profile_unauthenticated_rejection(
  connection: api.IConnection,
) {
  // Step 1: Register a test user to establish valid API context
  const testUserData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphabets(12),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ITodoListUser.ICreate;

  const registeredUser = await api.functional.auth.user.join(connection, {
    body: testUserData,
  });
  typia.assert(registeredUser);

  // Step 2: Create an unauthenticated connection (no Authorization header)
  const unauthenticatedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  // Step 3: Attempt to access the profile endpoint without authentication
  // Step 4: Verify that the operation throws a 401 Unauthorized error
  await TestValidator.httpError(
    "profile endpoint should reject unauthenticated requests with 401",
    401,
    async () => {
      return await api.functional.todoList.user.auth.user.profile.at(
        unauthenticatedConnection,
      );
    },
  );
}
