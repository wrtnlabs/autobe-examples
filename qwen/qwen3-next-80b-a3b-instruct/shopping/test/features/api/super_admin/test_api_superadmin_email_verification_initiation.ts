import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAuthorizationToken";
import type { IShoppingMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSuperAdmin";
import type { IShoppingMallSuperAdminEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSuperAdminEmailVerification";
import { prepare_random_shopping_mall_super_admin_email_verification } from "../../../prepare/prepare_random_shopping_mall_super_admin_email_verification";
import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";
export async function test_api_superadmin_email_verification_initiation(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a new connection and authenticate as superAdmin
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdmin: IShoppingMallSuperAdmin.IAuthorized =
    await authorize_super_admin_join(superAdminConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
      } satisfies IShoppingMallSuperAdmin.IJoin,
    });
  typia.assert(superAdmin);
  // Step 2: Use the authenticated superAdmin connection to initiate email verification
  // No request body is needed for this operation
  const response: IShoppingMallSuperAdminEmailVerification.ICreate =
    await api.functional.shoppingMall.superAdmin.auth.superAdmins.email.verify.create(
      superAdminConnection,
    );
  typia.assert(response);
  // Step 3: Validate that the response matches the expected empty ICreate type
  TestValidator.equals("response should be empty ICreate object", response, {});
}
