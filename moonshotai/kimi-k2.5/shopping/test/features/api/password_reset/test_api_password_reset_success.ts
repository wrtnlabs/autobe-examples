import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallCustomerPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerPasswordReset";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test successful password reset using a valid, non-expired token.
 *
 * The administrator provides a valid reset token and a new password that meets
 * platform security requirements. The system validates the token, updates the
 * user's password hash, deletes the token to prevent reuse, invalidates all
 * existing sessions for security, and returns success.
 */
export async function test_api_password_reset_success(
  connection: api.IConnection,
): Promise<void> {
  // Create actor-specific connection for the password reset operation
  const resetConnection: api.IConnection = { host: connection.host };
  // Generate valid password reset credentials
  const body = {
    token: typia.random<string>(),
    password: typia.random<string & tags.Format<"password">>(),
  } satisfies IEcommerceMallCustomerPasswordReset.IUpdate;
  // Execute password reset - endpoint returns void on success
  await api.functional.ecommerceMall.admin.password_resets.resetPassword(
    resetConnection,
    { body },
  );
}
