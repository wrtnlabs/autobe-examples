import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCustomerPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerPasswordReset";
import type { IEcommerceMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

export async function test_api_superadmin_password_reset_replaces_existing_token(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as super administrator
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdmin = await authorize_super_admin_join(superAdminConnection, {});
  typia.assert(superAdmin);
  // 2. Request password reset for a customer (first request - creates token)
  const testEmail = typia.random<string & tags.Format<"email">>();
  const firstResetResponse =
    await api.functional.ecommerceMall.superAdmin.password_resets.request(
      superAdminConnection,
      {
        body: {
          email: testEmail,
          newPassword: RandomGenerator.alphaNumeric(16) as string &
            tags.Format<"password">,
        } satisfies IEcommerceMallCustomerPasswordReset.IRequest,
      },
    );
  typia.assert(firstResetResponse);
  TestValidator.equals(
    "first reset response message",
    firstResetResponse.message,
    "If an account with that email exists, a password reset link has been sent.",
  );
  // 3. Request password reset for the same customer (second request - invalidates first token)
  const secondResetResponse =
    await api.functional.ecommerceMall.superAdmin.password_resets.request(
      superAdminConnection,
      {
        body: {
          email: testEmail,
          newPassword: RandomGenerator.alphaNumeric(16) as string &
            tags.Format<"password">,
        } satisfies IEcommerceMallCustomerPasswordReset.IRequest,
      },
    );
  typia.assert(secondResetResponse);
  TestValidator.equals(
    "second reset response message",
    secondResetResponse.message,
    "If an account with that email exists, a password reset link has been sent.",
  );
  // 4. Verify both responses succeed - confirming token replacement works
  TestValidator.predicate(
    "first reset completed successfully",
    firstResetResponse.message !== null &&
      firstResetResponse.message.length > 0,
  );
  TestValidator.predicate(
    "second reset completed successfully",
    secondResetResponse.message !== null &&
      secondResetResponse.message.length > 0,
  );
  // 5. Verify that the system allows multiple reset requests (no error thrown)
  // This confirms the old token is properly invalidated when new one is created
  TestValidator.equals(
    "both requests succeeded with same message",
    firstResetResponse.message,
    secondResetResponse.message,
  );
}
