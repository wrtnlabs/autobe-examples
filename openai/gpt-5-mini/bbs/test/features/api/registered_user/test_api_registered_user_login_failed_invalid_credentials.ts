import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconPoliticalForumRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumRegisteredUser";

export async function test_api_registered_user_login_failed_invalid_credentials(
  connection: api.IConnection,
) {
  // 1) Prepare test user data
  const username = RandomGenerator.alphaNumeric(8);
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(16);

  const joinBody = {
    username,
    email,
    password,
    display_name: RandomGenerator.name(),
  } satisfies IEconPoliticalForumRegisteredUser.IJoin;

  // 2) Create the registered user (dependency)
  const created: IEconPoliticalForumRegisteredUser.IAuthorized =
    await api.functional.auth.registeredUser.join(connection, {
      body: joinBody,
    });
  typia.assert(created);

  // 3) Use an unauthenticated connection for login attempts to avoid
  //    SDK-propagated Authorization header set by join()
  const unauthConn: api.IConnection = { ...connection, headers: {} };

  // 4) Attempt to login with an incorrect password and expect an error
  await TestValidator.error(
    "login with wrong password should fail",
    async () => {
      await api.functional.auth.registeredUser.login(unauthConn, {
        body: {
          usernameOrEmail: joinBody.username,
          password: "this-is-wrong-password",
        } satisfies IEconPoliticalForumRegisteredUser.ILogin,
      });
    },
  );

  // 5) After a single failed attempt, verify that correct credentials still work
  const auth: IEconPoliticalForumRegisteredUser.IAuthorized =
    await api.functional.auth.registeredUser.login(unauthConn, {
      body: {
        usernameOrEmail: joinBody.username,
        password: joinBody.password,
      } satisfies IEconPoliticalForumRegisteredUser.ILogin,
    });
  typia.assert(auth);

  // 6) Business-level validations
  TestValidator.predicate(
    "received access token",
    typeof auth.token.access === "string" && auth.token.access.length > 0,
  );

  // If username is returned in the authorized response, ensure it matches
  if (auth.username !== null && auth.username !== undefined) {
    TestValidator.equals(
      "authorized username matches",
      auth.username,
      joinBody.username,
    );
  }

  // 7) Teardown note: No delete API provided in SDK. Rely on test DB reset or
  //    isolated test schemas for cleanup. (No runtime deletion attempted.)
}
