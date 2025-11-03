import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

export async function test_api_user_profile_retrieval(
  connection: api.IConnection,
) {
  // Step 1: Register a new user to establish authentication context
  const registrationEmail = typia.random<string & tags.Format<"email">>();
  const registrationPassword = typia.random<string & tags.MinLength<8>>();

  const registeredUser: ITodoListUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: {
        email: registrationEmail,
        password: registrationPassword,
        ip: "127.0.0.1",
        href: "https://example.com/register",
        referrer: "https://example.com/home",
      } satisfies ITodoListUser.IRegister,
    });
  typia.assert(registeredUser);

  // Step 2: Retrieve the authenticated user's profile
  const userProfile: ITodoListUser =
    await api.functional.todoList.user.users.me.at(connection);
  typia.assert(userProfile);

  // Step 3: Validate profile data matches registration data
  TestValidator.equals(
    "profile email matches registration email",
    userProfile.email,
    registrationEmail,
  );

  TestValidator.equals(
    "profile ID matches authenticated user ID",
    userProfile.id,
    registeredUser.id,
  );

  TestValidator.equals(
    "profile created_at matches registration timestamp",
    userProfile.created_at,
    registeredUser.created_at,
  );

  TestValidator.equals(
    "profile updated_at matches registration timestamp",
    userProfile.updated_at,
    registeredUser.updated_at,
  );

  // Step 4: Verify account is active (not soft deleted)
  TestValidator.equals(
    "account is active with null deleted_at",
    userProfile.deleted_at,
    null,
  );
}
