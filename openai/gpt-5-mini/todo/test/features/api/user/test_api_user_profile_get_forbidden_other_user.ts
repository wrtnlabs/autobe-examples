import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";

export async function test_api_user_profile_get_forbidden_other_user(
  connection: api.IConnection,
) {
  // 1) Prepare two isolated connections so that SDK-set Authorization headers
  //    do not interfere with each other or with the provided connection.
  const ownerConn: api.IConnection = { ...connection, headers: {} };
  const callerConn: api.IConnection = { ...connection, headers: {} };

  // 2) Create Owner A via POST /auth/user/join
  const ownerEmail = typia.random<string & tags.Format<"email">>();
  const ownerBody = {
    email: ownerEmail,
    password: "Password123!",
    display_name: RandomGenerator.name(),
  } satisfies ITodoAppUser.ICreate;

  const ownerAuth: ITodoAppUser.IAuthorized =
    await api.functional.auth.user.join(ownerConn, {
      body: ownerBody,
    });
  typia.assert(ownerAuth);

  // 3) Create Caller B via POST /auth/user/join
  const callerEmail = typia.random<string & tags.Format<"email">>();
  const callerBody = {
    email: callerEmail,
    password: "Password123!",
    display_name: RandomGenerator.name(),
  } satisfies ITodoAppUser.ICreate;

  const callerAuth: ITodoAppUser.IAuthorized =
    await api.functional.auth.user.join(callerConn, {
      body: callerBody,
    });
  typia.assert(callerAuth);

  // 4) Caller B (authenticated via callerConn) attempts to read Owner A's profile
  //    Expectation: 403 Forbidden. Use TestValidator.httpError to validate the
  //    HTTP error status code.
  await TestValidator.httpError(
    "caller cannot retrieve another user's private profile",
    403,
    async () => {
      await api.functional.todoApp.user.users.at(callerConn, {
        userId: ownerAuth.id,
      });
    },
  );

  // 5) Confirm Owner A can retrieve their own profile successfully
  const ownerProfile: ITodoAppUser = await api.functional.todoApp.user.users.at(
    ownerConn,
    {
      userId: ownerAuth.id,
    },
  );
  typia.assert(ownerProfile);
  TestValidator.equals(
    "owner can retrieve own profile",
    ownerProfile.id,
    ownerAuth.id,
  );
}
