import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallAdminPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdminPasswordReset";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_password_reset_not_found(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin account via admin request
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "Admin1234!" satisfies string & tags.Format<"password">;
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      actorType: "customer",
      requestedGrade: "admin",
      reason: RandomGenerator.paragraph({
        sentences: 5,
        wordMin: 3,
        wordMax: 8,
      }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallAdmin.IJoin,
  });
  // 2. Login as admin to get authorized token
  const authorizedAdminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_login(authorizedAdminConnection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallAdmin.ILogin,
  });
  // 3. Call target endpoint with non-existent UUID
  const nonExistentId = typia.random<string & tags.Format<"uuid">>();
  // 4. Validate 404 error is returned
  await TestValidator.httpError(
    "non-existent password reset should return 404",
    404,
    async () =>
      await api.functional.ecommerceMall.admin.admin.password_resets.at(
        authorizedAdminConnection,
        {
          resetId: nonExistentId,
        },
      ),
  );
}
