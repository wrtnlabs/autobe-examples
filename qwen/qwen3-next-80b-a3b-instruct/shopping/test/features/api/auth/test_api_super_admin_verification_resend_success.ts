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
import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";
export async function test_api_super_admin_verification_resend_success(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a new connection and authenticate as superAdmin
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdmin = await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IShoppingMallSuperAdmin.IJoin,
  });
  typia.assert(superAdmin);
  // Step 2: Use the authenticated superAdmin connection to resend verification email
  const result: IShoppingMallSuperAdminEmailVerification =
    await api.functional.shoppingMall.superAdmin.auth.superAdmins.email.resend(
      superAdminConnection,
    );
  typia.assert(result);
  // Step 3: Validate the response contains the correct success message
  TestValidator.equals(
    "verification email resend success message",
    result.message,
    "Verification email resent successfully",
  );
}
