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

export async function test_api_password_reset_expired_token(
  connection: api.IConnection,
): Promise<void> {
  // Create and authenticate as administrator to test password reset flow
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IEcommerceMallAdmin.IJoin,
  });
  // Attempt password reset with an expired token
  // The system searches all password reset tables and determines the token has expired
  const body = {
    token: RandomGenerator.alphaNumeric(64),
    password: typia.random<string & tags.Format<"password">>(),
  } satisfies IEcommerceMallCustomerPasswordReset.IUpdate;
  // Expect 410 Gone error since the token has passed its expiration date
  await TestValidator.httpError(
    "expired password reset token returns 410 Gone",
    410,
    async () => {
      await api.functional.ecommerceMall.admin.password_resets.resetPassword(
        adminConnection,
        { body },
      );
    },
  );
}
