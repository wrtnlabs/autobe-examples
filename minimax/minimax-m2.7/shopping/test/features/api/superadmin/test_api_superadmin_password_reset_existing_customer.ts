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

export async function test_api_superadmin_password_reset_existing_customer(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create super admin connection using utility function
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdmin = await authorize_super_admin_join(superAdminConnection, {});
  typia.assert(superAdmin);
  // 2. Submit password reset request with a valid customer email format
  // The system returns a generic success message for security (prevents email enumeration)
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const response =
    await api.functional.ecommerceMall.superAdmin.password_resets.request(
      superAdminConnection,
      {
        body: {
          email: customerEmail,
          newPassword: typia.random<string & tags.Format<"password">>(),
        } satisfies IEcommerceMallCustomerPasswordReset.IRequest,
      },
    );
  typia.assert(response);
  // 3. Validate the generic success message is returned
  // This message is returned regardless of whether the email exists (security measure)
  TestValidator.equals(
    "password reset success message",
    response.message,
    "If an account with that email exists, a password reset link has been sent.",
  );
}
