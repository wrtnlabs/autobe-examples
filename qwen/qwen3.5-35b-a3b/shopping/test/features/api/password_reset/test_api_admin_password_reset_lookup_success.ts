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
 * Test admin password reset lookup success scenario.
 * Validates that authenticated admin can retrieve password reset token records.
 */
export async function test_api_admin_password_reset_lookup_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin authentication
  const adminConnection: api.IConnection = { host: connection.host };
  const admin: IEcommerceMallAdmin.IAuthorized = await authorize_admin_join(
    adminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      } satisfies IEcommerceMallAdmin.IJoin,
    },
  );
  typia.assert(admin);
  // 2. Generate password reset token record
  const resetToken: IEcommerceMallCustomerPasswordReset = {
    id: typia.random<string & tags.Format<"uuid">>(),
    customer_id: typia.random<string & tags.Format<"uuid">>(),
    token: RandomGenerator.alphaNumeric(64),
    expired_at: typia.random<string & tags.Format<"date-time">>(),
    created_at: new Date().toISOString(),
  } satisfies IEcommerceMallCustomerPasswordReset;
  // 3. Retrieve password reset token
  const retrievedToken: IEcommerceMallCustomerPasswordReset =
    await api.functional.ecommerceMall.admin.password_resets.at(
      adminConnection,
      {
        resetId: resetToken.id,
      },
    );
  typia.assert(retrievedToken);
  // 4. Validate response
  TestValidator.equals("reset token id", retrievedToken.id, resetToken.id);
  TestValidator.equals(
    "customer id matches",
    retrievedToken.customer_id,
    resetToken.customer_id,
  );
  TestValidator.equals("token value", retrievedToken.token, resetToken.token);
  TestValidator.equals(
    "expired_at timestamp",
    retrievedToken.expired_at,
    resetToken.expired_at,
  );
  TestValidator.equals(
    "created_at timestamp",
    retrievedToken.created_at,
    resetToken.created_at,
  );
}