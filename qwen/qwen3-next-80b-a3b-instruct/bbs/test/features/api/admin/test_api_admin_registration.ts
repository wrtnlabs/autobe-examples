import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicForumAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicForumAdmin";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_admin_registration(
  connection: api.IConnection,
): Promise<void> {
  // Create a new connection object for admin registration
  const adminConnection: api.IConnection = { host: connection.host };
  // Generate valid test credentials
  const testEmail = typia.random<string & tags.Format<"email">>();
  const testPassword = RandomGenerator.alphaNumeric(16); // 16-character random string
  // Perform admin registration using the utility function (mandatory by policy)
  const registrationResult: IEconomicForumAdmin.IAuthorized =
    await authorize_admin_join(adminConnection, {
      body: {
        email: testEmail,
        password: testPassword,
      } satisfies IEconomicForumAdmin.IJoin,
    });
  // Validate the registration response structure
  typia.assert(registrationResult);
  // Validate that the returned ID is a valid UUID (guaranteed by typia.assert)
  TestValidator.equals(
    "admin ID matches input",
    registrationResult.id,
    registrationResult.id,
  );
  // Validate that the email in response matches the input email
  TestValidator.equals(
    "response email matches input email",
    registrationResult.email,
    testEmail,
  );
  // Validate that the token object is present and correctly structured
  TestValidator.predicate(
    "token object exists",
    () => registrationResult.token !== undefined,
  );
  // Validate access token is a non-empty string
  TestValidator.predicate(
    "access token is a non-empty string",
    () =>
      typeof registrationResult.token.access === "string" &&
      registrationResult.token.access.length > 0,
  );
  // Validate refresh token is a non-empty string
  TestValidator.predicate(
    "refresh token is a non-empty string",
    () =>
      typeof registrationResult.token.refresh === "string" &&
      registrationResult.token.refresh.length > 0,
  );
  // Validate that name is a non-empty string
  TestValidator.predicate(
    "admin name is a non-empty string",
    () =>
      typeof registrationResult.name === "string" &&
      registrationResult.name.length > 0,
  );
  // Validate that role is a non-empty string
  TestValidator.predicate(
    "admin role is a non-empty string",
    () =>
      typeof registrationResult.role === "string" &&
      registrationResult.role.length > 0,
  );
  // Validate that status is a non-empty string
  TestValidator.predicate(
    "admin status is a non-empty string",
    () =>
      typeof registrationResult.status === "string" &&
      registrationResult.status.length > 0,
  );
  // Validate that createdAt is a valid date-time (guaranteed by typia.assert)
  TestValidator.equals(
    "createdAt is a string",
    typeof registrationResult.createdAt,
    "string",
  );
  // Validate that updatedAt is a valid date-time (guaranteed by typia.assert)
  TestValidator.equals(
    "updatedAt is a string",
    typeof registrationResult.updatedAt,
    "string",
  );
}
