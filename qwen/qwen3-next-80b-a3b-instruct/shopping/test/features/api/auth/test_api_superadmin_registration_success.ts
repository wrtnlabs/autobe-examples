import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAuthorizationToken";
import type { IShoppingMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSuperAdmin";
import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";
export async function test_api_superadmin_registration_success(
  connection: api.IConnection,
): Promise<void> {
  // Create a new connection for superAdmin registration
  const superAdminConnection: api.IConnection = { host: connection.host };
  // Generate valid superAdmin registration data
  const superAdminEmail = RandomGenerator.alphaNumeric(5) + "@example.com";
  const superAdminPassword = RandomGenerator.alphaNumeric(16);
  // Execute superAdmin registration using the utility function (mandatory)
  const result: IShoppingMallSuperAdmin.IAuthorized =
    await authorize_super_admin_join(superAdminConnection, {
      body: {
        email: superAdminEmail,
        password: superAdminPassword,
      } satisfies IShoppingMallSuperAdmin.IJoin,
    });
  // Validate the successful response with typia.assert (complete validation)
  typia.assert(result);
  // Verify that email matches input
  TestValidator.equals(
    "superAdmin email matches input",
    result.email,
    superAdminEmail,
  );
  // Verify admin type is 'super'
  TestValidator.equals(
    "superAdmin adminType is 'super'",
    result.adminType,
    "super",
  );
  // Validate token structure exists
  await TestValidator.predicate("token.access exists", result.token.access != null);
  await TestValidator.predicate("token.refresh exists", result.token.refresh != null);
  // Verify connection headers were updated with access token (using connection isolation pattern)
  await TestValidator.predicate(
    "connection headers contain Authorization",
    superAdminConnection.headers?.Authorization !== undefined === true,
  );
}