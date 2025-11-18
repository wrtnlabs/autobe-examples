import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Validate retrieval of user profile by owner identity.
 *
 * 1. Register a new user with random email, password, and required metadata (href,
 *    referrer)
 * 2. Extract authenticated user UUID from registration
 * 3. Query user details endpoint with self UUID while authenticated
 * 4. Assert response structure matches ITodoListUser (id, email, created_at,
 *    updated_at)
 * 5. Assert password is never present in response
 * 6. Check ID and email in profile match those returned at registration
 * 7. All values asserted via typia and TestValidator
 */
export async function test_api_user_profile_retrieval_by_owner(
  connection: api.IConnection,
) {
  // 1. Register a new user (join)
  const reqJoin = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(15),
    href: "https://app.example.com/register",
    referrer: "https://landing.example.com/",
  } satisfies ITodoListUser.ICreate;
  const joinResult = await api.functional.auth.user.join(connection, {
    body: reqJoin,
  });
  typia.assert(joinResult);
  // 2. Extract userId and email from join response
  const { id: userId, email: registeredEmail } = joinResult;
  // 3. Query profile for self, authenticated (token already set in connection)
  const profile = await api.functional.todoList.user.users.at(connection, {
    userId,
  });
  typia.assert(profile);
  // 4. Assert userId, email match
  TestValidator.equals("profile.id matches authorized id", profile.id, userId);
  TestValidator.equals(
    "profile.email matches registration",
    profile.email,
    registeredEmail,
  );
  // 5. Structural type check: only whitelisted fields present (no password, no token)
  TestValidator.predicate(
    "profile does not have password property",
    !("password" in profile),
  );
  TestValidator.predicate(
    "profile does not have token property",
    !("token" in profile),
  );
  // 6. Validate date-time formats
  TestValidator.predicate(
    "created_at field is ISO 8601",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(profile.created_at),
  );
  TestValidator.predicate(
    "updated_at field is ISO 8601",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(profile.updated_at),
  );
}
