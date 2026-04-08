import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallCustomerPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerPasswordReset";
import type { IEcommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerProfile";
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

export async function test_api_superadmin_password_reset_retrieval_valid_token(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as superAdmin
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdminAuth = await authorize_super_admin_join(
    superAdminConnection,
    {},
  );
  // 2. Generate UUID for resetId (simulating existing password reset token)
  const resetId = typia.random<string & tags.Format<"uuid">>();
  // 3. Call GET /ecommerceMall/superAdmin/password-resets/{resetId}
  const passwordReset =
    await api.functional.ecommerceMall.superAdmin.password_resets.at(
      superAdminConnection,
      {
        resetId: resetId,
      },
    );
  // 4. Validate response with typia.assert
  typia.assert(passwordReset);
  // 5. Validate response structure
  TestValidator.equals(
    "has valid id",
    typeof passwordReset.id === "string",
    true,
  );
  TestValidator.equals(
    "has customer summary",
    passwordReset.customer !== undefined,
    true,
  );
  TestValidator.equals(
    "has expiresAt",
    passwordReset.expiresAt !== undefined,
    true,
  );
  TestValidator.equals("usedAt is null", passwordReset.usedAt, null);
  // 6. Validate customer summary structure
  TestValidator.equals(
    "customer has id",
    typeof passwordReset.customer.id === "string",
    true,
  );
  TestValidator.equals(
    "customer has email",
    typeof passwordReset.customer.email === "string",
    true,
  );
  TestValidator.equals(
    "customer has customerProfile",
    passwordReset.customer.customerProfile !== undefined,
    true,
  );
  // 7. Validate security - token hash should NOT be in response
  TestValidator.equals(
    "passwordReset does not have tokenHash",
    "tokenHash" in passwordReset,
    false,
  );
}
