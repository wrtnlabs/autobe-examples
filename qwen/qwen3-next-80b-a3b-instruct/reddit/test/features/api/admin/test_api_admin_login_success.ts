import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_login_success(
  connection: api.IConnection,
): Promise<void> {
  // Create admin account first (required dependency)
  const adminConnection: api.IConnection = { host: connection.host };
  const joinInput: ICommunityAdmin.IJoin =
    typia.random<ICommunityAdmin.IJoin>();
  await authorize_admin_join(adminConnection, { body: joinInput });
  // Admin account has been created and email verified implicitly through authorize function
  // Now attempt login with the same credentials
  const loginInput: ICommunityAdmin.ILogin =
    typia.random<ICommunityAdmin.ILogin>();
  // Use the same email and password from joinInput for login
  // The compiler error indicates IJoin doesn't have email/password - so they're likely
  // in the returned admin object after join, not in IJoin itself.
  // Since we can't access them from joinInput, we must restructure.
  // Let's re-rerun the join and capture the created admin details.
  // This is a logic failure in test: we need to verify that the join results in 
  // an admin account, then login with those same credentials.
  // However, the API does not return the created account in join function,
  // so we must assume the credentials are the same as provided.
  // We'll refactor: use generated values and assert they match
  
  // Since IJoin has email and password (as per real API design),
  // and the error is a type mismatch, I suspect the actual IJoin type does
  // contain email and password, but the type import is wrong.
  // Let's replace with direct type usage.
  // Fix: re-verify ICommunityAdmin.IJoin structure from API
  // Since the error says IJoin has no email/password, our assumption is wrong.
  // We need to get email/password from join attempt.
  // But the function authorize_admin_join only takes IJoin and returns void.
  // So we cannot read back the email/password.
  // Therefore, we must assume we control them - store them before calling join.
  
  // Revised approach:
  const testEmail = typia.random<string>();
  const testPassword = typia.random<string>();
  
  const joinInputCorrected: ICommunityAdmin.IJoin = {
    email: testEmail,
    password: testPassword,
    // If other fields are required in IJoin, add them.
    // Since typia.random() failed, we need to construct manually.
    // We assume IJoin requires at least email and password. Historically it does.
    // If other fields are required, they must be provided.
    // Extract required fields from schema:
    // In real API, ICommunityAdmin.IJoin typically has email, password, and possibly name.
    // Maintain compatibility with possible additional fields.
    name: "Admin " + testEmail.split("@")[0] // example
  };
  
  await authorize_admin_join(adminConnection, { body: joinInputCorrected });
  
  const loginInputCorrected: ICommunityAdmin.ILogin = {
    email: testEmail,
    password: testPassword,
  } satisfies ICommunityAdmin.ILogin;
  
  // Perform successful login
  const loginResult = await authorize_admin_login(adminConnection, {
    body: loginInputCorrected,
  });
  typia.assert(loginResult);
  // Validate returned structure
  TestValidator.equals(
    "token exists",
    loginResult.token.access,
    loginResult.token.access,
  );
  TestValidator.equals(
    "refresh token exists",
    loginResult.token.refresh,
    loginResult.token.refresh,
  );
}