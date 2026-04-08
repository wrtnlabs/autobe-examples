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
 * Test API password reset retrieval success.
 *
 * Verify successful retrieval of a password reset record by its unique identifier.
 * This validates that an authenticated administrator can retrieve password reset
 * token details including the token string, creation timestamp, and expiration timestamp.
 */
export async function test_api_password_reset_retrieval_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create an authenticated admin connection using utility function
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {},
  });
  // 2. Generate random resetId UUID
  const resetId = typia.random<string & tags.Format<"uuid">>();
  // 3. Retrieve the password reset record
  const passwordReset: IEcommerceMallCustomerPasswordReset =
    await api.functional.ecommerceMall.admin.password_resets.at(
      adminConnection,
      { resetId },
    );
  // 4. Validate response structure matches expected DTO
  typia.assert(passwordReset);
}
