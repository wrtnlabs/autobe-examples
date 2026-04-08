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

export async function test_api_superadmin_password_reset_retrieval_expired_token(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as superAdmin to access password reset audit endpoint
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdmin = await authorize_super_admin_join(superAdminConnection, {});
  // 2. Create a random reset ID for the expired token lookup
  const resetId = typia.random<string & tags.Format<"uuid">>();
  // 3. Call GET /ecommerceMall/superAdmin/password-resets/{resetId}
  const passwordReset =
    await api.functional.ecommerceMall.superAdmin.password_resets.at(
      superAdminConnection,
      {
        resetId: resetId,
      },
    );
  // 4. Validate response structure
  typia.assert(passwordReset);
  // 5. Validate expiresAt is in the past (token is expired)
  const now = new Date();
  const expiresAt = new Date(passwordReset.expiresAt);
  TestValidator.predicate(
    "token should be expired (expiresAt in the past)",
    expiresAt < now,
  );
  // 6. Validate usedAt is null (token not yet used)
  TestValidator.equals(
    "usedAt should be null for unused token",
    passwordReset.usedAt,
    null,
  );
  // 7. Validate customer information is present
  TestValidator.predicate(
    "customer should be present in response",
    passwordReset.customer !== undefined && passwordReset.customer !== null,
  );
}
