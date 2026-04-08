import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

export async function test_api_admin_retrieval_by_regular_admin_denied(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create a super admin account to get a valid adminId
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdmin = await authorize_super_admin_join(superAdminConnection, {});
  typia.assert(superAdmin);
  // 2. Create a regular admin account via the super admin (capture password for login)
  const adminPassword = RandomGenerator.alphaNumeric(16);
  const admin = await api.functional.ecommerceMall.auth.admin.join(
    superAdminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: adminPassword,
        name: RandomGenerator.name(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IEcommerceMallAdmin.IJoin,
    },
  );
  typia.assert(admin);
  // 3. Authenticate as the regular admin
  const regularAdminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_login(regularAdminConnection, {
    body: {
      email: admin.email,
      password: adminPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallAdmin.ILogin,
  });
  // 4. Attempt to retrieve admin details - should be denied with 403 Forbidden
  await TestValidator.httpError(
    "regular admin cannot retrieve admin account details",
    403,
    async () =>
      await api.functional.ecommerceMall.superAdmin.admin.admins.at(
        regularAdminConnection,
        {
          adminId: admin.id,
        },
      ),
  );
}
