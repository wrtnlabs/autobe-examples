import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_retrieval_not_found(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create super administrator account
  const adminJoinConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminJoinConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallAdmin.IJoin,
  });
  typia.assert(adminAuth);
  // 2. Create authenticated connection for admin
  const adminConnection: api.IConnection = { host: connection.host };
  adminConnection.headers = { Authorization: adminAuth.token.access };
  // 3. Attempt to retrieve non-existent admin with random UUID
  const nonExistentAdminId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.httpError(
    "404 Not Found for non-existent admin",
    [404],
    async () => {
      await api.functional.ecommerceMall.admin.admins.at(adminConnection, {
        adminId: nonExistentAdminId,
      });
    },
  );
}
