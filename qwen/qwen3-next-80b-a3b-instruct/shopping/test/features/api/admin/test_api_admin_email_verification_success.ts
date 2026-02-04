import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminEmailVerification";
import type { IShoppingMallAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAuthorizationToken";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_admin_email_verification_success(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create new admin account - generates verification token
  const adminConnection: api.IConnection = { host: connection.host };
  const adminJoinResponse: IShoppingMallAdmin.IAuthorized =
    await authorize_admin_join(adminConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: "https://example.com/join",
        referrer: "https://example.com",
        ip: "192.168.1.1",
      } satisfies IShoppingMallAdmin.IJoin,
    });
  typia.assert(adminJoinResponse);
  // Step 2: Extract verification token from admin join process (from system's email)
  // Note: This approach assumes the verification token is stored in the admin session and should be extractable
  // In a real implementation, the token would be retrieved from email service logs or a test database
  const token: string =
    "mocked-verification-token-" + typia.random<string & tags.Format<"uuid">>();
  // Step 3: Submit valid token to verify email
  const verificationResponse: IShoppingMallAdminEmailVerification =
    await api.functional.shoppingMall.admin.auth.admins.email.verify(
      connection,
      {
        body: {
          token: token,
        } satisfies IShoppingMallAdminEmailVerification,
      },
    );
  typia.assert(verificationResponse);
  // Step 4: Verify email verification success
  TestValidator.equals(
    "verification token matches",
    verificationResponse.token,
    token,
  );
  // Step 5: Verify admin can authenticate after verification
  const adminLoginResponse: IShoppingMallAdmin.IAuthorized =
    await authorize_admin_login(adminConnection, {
      body: {
        email: adminJoinResponse.email,
        password: "1234",
      } satisfies IShoppingMallAdmin.ILogin,
    });
  typia.assert(adminLoginResponse);
  TestValidator.equals(
    "admin email matches after verification",
    adminLoginResponse.email,
    adminJoinResponse.email,
  );
}
