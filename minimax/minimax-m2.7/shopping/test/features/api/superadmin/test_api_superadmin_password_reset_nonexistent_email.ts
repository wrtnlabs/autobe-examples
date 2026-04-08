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

export async function test_api_superadmin_password_reset_nonexistent_email(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as super administrator
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16) as string &
        tags.Format<"password">,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // 2. Generate a non-existent email address
  const nonExistentEmail = typia.random<string & tags.Format<"email">>();
  // 3. Request password reset for non-existent email
  const response =
    await api.functional.ecommerceMall.superAdmin.password_resets.request(
      superAdminConnection,
      {
        body: {
          email: nonExistentEmail,
          newPassword: RandomGenerator.alphaNumeric(16) as string &
            tags.Format<"password">,
        } satisfies IEcommerceMallCustomerPasswordReset.IRequest,
      },
    );
  typia.assert(response);
  // 4. Verify the generic success message is returned (email enumeration prevention)
  TestValidator.equals(
    "generic success message for non-existent email",
    response.message,
    "If an account with that email exists, a password reset link has been sent.",
  );
}
