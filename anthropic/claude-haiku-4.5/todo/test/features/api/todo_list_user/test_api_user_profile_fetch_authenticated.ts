import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Validate fetching authenticated user's own profile after successful
 * registration.
 *
 * Scenario:
 *
 * 1. Register a user account with a unique email and strong password (simulate
 *    realistic signup context with href and referrer).
 * 2. After registration, fetch the user's profile using /todoList/user/users/me
 *    (authenticated context).
 * 3. Validate the response contains only 'email' and 'created_at', both matching
 *    expected values/formats, and does not expose sensitive fields.
 * 4. Attempt fetching this endpoint without authentication—ensure access is
 *    denied.
 * 5. Register a second unrelated user and repeat the process, ensuring both can
 *    only see their own profile after logging in (never another user).
 */
export async function test_api_user_profile_fetch_authenticated(
  connection: api.IConnection,
) {
  // 1. Register a unique user
  const user1Email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(12);
  const user1Join = await api.functional.auth.user.join(connection, {
    body: {
      email: user1Email,
      password: password,
      href: "https://app.todolist.example.com/signup",
      referrer: "https://app.todolist.example.com/landing",
      ip: null,
    },
  });
  typia.assert(user1Join);
  // 2. Fetch the authenticated user's profile (after registration, session is set)
  const profile1 = await api.functional.todoList.user.users.me.at(connection);
  typia.assert(profile1);
  TestValidator.equals(
    "profile email matches joined user",
    profile1.email,
    user1Email,
  );
  // Validate the email format and date-time format
  TestValidator.predicate(
    "profile email is RFC5322 format",
    /.+@.+\..+/.test(profile1.email),
  );
  TestValidator.predicate(
    "created_at is ISO8601 date-time",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(.\d+)?Z$/.test(profile1.created_at),
  );
  // Validate only email and created_at present, not sensitive info
  TestValidator.equals(
    "no sensitive fields exposed",
    Object.keys(profile1).sort(),
    ["created_at", "email"],
  );

  // 3. Try fetching profile unauthenticated ― should be denied
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "cannot fetch profile when unauthenticated",
    async () => {
      await api.functional.todoList.user.users.me.at(unauthConn);
    },
  );

  // 4. Register a second unrelated user
  const user2Email = typia.random<string & tags.Format<"email">>();
  const password2 = RandomGenerator.alphaNumeric(16);
  const user2Join = await api.functional.auth.user.join(connection, {
    body: {
      email: user2Email,
      password: password2,
      href: "https://app.todolist.example.com/signup",
      referrer: "https://app.todolist.example.com/landing",
      ip: null,
    },
  });
  typia.assert(user2Join);
  // As user2, fetch profile—should see only themselves
  const profile2 = await api.functional.todoList.user.users.me.at(connection);
  typia.assert(profile2);
  TestValidator.equals("profile is for user2 only", profile2.email, user2Email);
  // Log back as user1 to verify profile isolation
  await api.functional.auth.user.join(connection, {
    body: {
      email: user1Email,
      password: password,
      href: "https://app.todolist.example.com/signup",
      referrer: "https://app.todolist.example.com/landing",
      ip: null,
    },
  });
  const profile1Again =
    await api.functional.todoList.user.users.me.at(connection);
  typia.assert(profile1Again);
  TestValidator.equals(
    "re-logged in as user1 shows only user1 profile",
    profile1Again.email,
    user1Email,
  );
}
