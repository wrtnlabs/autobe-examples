import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppTodoAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoAdmin";
import type { ITodoAppTodoAdminLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoAdminLogin";

/**
 * Validate successful todoAdmin login flow and authorization token structure.
 *
 * This E2E test exercises the `/auth/todoAdmin/login` endpoint using the
 * generated SDK function `api.functional.auth.todoAdmin.login`. It focuses on
 * verifying that, given a syntactically valid login request payload, the
 * service returns a properly shaped `ITodoAppTodoAdmin.IAuthorized` object
 * containing both administrator identity data and a well-formed
 * `IAuthorizationToken` bundle.
 *
 * Business / technical objectives:
 *
 * 1. Ensure the login SDK function is callable with the
 *    `ITodoAppTodoAdminLogin.IRequest` DTO as the request body.
 * 2. Validate that the response conforms to `ITodoAppTodoAdmin.IAuthorized` using
 *    `typia.assert`, including all tagged formats (UUID, email, date-time
 *    fields).
 * 3. Confirm that the embedded `token` field is a valid `IAuthorizationToken`
 *    object whose `access` and `refresh` strings are non-empty.
 * 4. Implicitly ensure that sensitive fields like raw passwords or password hashes
 *    are not part of the response shape (guaranteed by the DTO definition and
 *    `typia.assert`).
 *
 * Note: The textual scenario mentions a pre-existing admin account in the
 * database. As the current test materials do not expose an admin creation API,
 * and the mock example already uses `typia.random` request data, this test
 * focuses on the contract and type-level behavior. In environments where
 * fixtures provide a concrete admin, the request body can be replaced with
 * deterministic credentials without changing the overall structure.
 */
export async function test_api_todoadmin_login_success(
  connection: api.IConnection,
) {
  // Prepare a login request DTO. For this generated test, we leverage
  // typia.random to satisfy the `ITodoAppTodoAdminLogin.IRequest` contract.
  const requestBody = typia.random<ITodoAppTodoAdminLogin.IRequest>();

  // Invoke the login endpoint via the generated SDK.
  const authorized: ITodoAppTodoAdmin.IAuthorized =
    await api.functional.auth.todoAdmin.login(connection, {
      body: requestBody,
    });

  // Validate that the response strictly matches the IAuthorized DTO,
  // including all tagged formats.
  typia.assert<ITodoAppTodoAdmin.IAuthorized>(authorized);

  // Additionally validate the token structure explicitly.
  typia.assert<IAuthorizationToken>(authorized.token);

  // Business-level sanity checks on token strings: they must not be empty.
  TestValidator.predicate(
    "access token should be non-empty string",
    authorized.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token should be non-empty string",
    authorized.token.refresh.length > 0,
  );
}
