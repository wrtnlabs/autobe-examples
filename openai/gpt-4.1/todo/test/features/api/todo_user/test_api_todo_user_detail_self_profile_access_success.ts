import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoUser";

/**
 * Test that a registered user can retrieve their own user detail successfully,
 * and cannot access others' details.
 *
 * Steps:
 *
 * 1. Register a new user (join) and authenticate to obtain session and id.
 * 2. Retrieve user details for self (expect success and field match).
 * 3. Register a second user (join) with a different email.
 * 4. While authenticated as the first user, attempt to access the second user's
 *    detail (expect error).
 */
export async function test_api_todo_user_detail_self_profile_access_success(
  connection: api.IConnection,
) {
  // 1. Register a new user
  const joinRequest = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    href: "https://test-href.example.com/register",
    referrer: "https://test-href.example.com/landing",
  } satisfies ITodoUser.IJoin;
  const auth: ITodoUser.IAuthorized = await api.functional.auth.user.join(
    connection,
    { body: joinRequest },
  );
  typia.assert(auth);

  // 2. Retrieve own user detail
  const userDetail: ITodoUser = await api.functional.todo.user.users.at(
    connection,
    { userId: auth.id },
  );
  typia.assert(userDetail);

  // Validate retrieved fields match registration information
  TestValidator.equals("user id matches", userDetail.id, auth.id);
  TestValidator.equals("user email matches", userDetail.email, auth.email);
  TestValidator.equals(
    "created_at matches",
    userDetail.created_at,
    auth.created_at,
  );
  TestValidator.equals(
    "updated_at matches",
    userDetail.updated_at,
    auth.updated_at,
  );

  // 3. Register a second user (to test access control)
  const joinRequest2 = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    href: "https://test-href.example.com/register2",
    referrer: "https://test-href.example.com/landing2",
  } satisfies ITodoUser.IJoin;
  const auth2: ITodoUser.IAuthorized = await api.functional.auth.user.join(
    connection,
    { body: joinRequest2 },
  );
  typia.assert(auth2);

  // 4. Attempt to get second user's detail as first user (should fail)
  await TestValidator.error("cannot access other user's detail", async () => {
    await api.functional.todo.user.users.at(connection, { userId: auth2.id });
  });
}
