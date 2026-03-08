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

export async function test_api_admin_demote_last_super_admin_protected(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create the only super administrator in the system
  const superAdminJoinConnection: api.IConnection = { host: connection.host };
  const superAdminJoinResult = await authorize_admin_join(
    superAdminJoinConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IEcommerceMallAdmin.IJoin,
    },
  );
  typia.assert(superAdminJoinResult);
  // 2. Create regular administrator (ensure system has admin users)
  const regularAdminJoinConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(regularAdminJoinConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallAdmin.IJoin,
  });
  // 3. Attempt to demote the last super administrator (self-demotion attempt)
  // This should be rejected with 403 Forbidden
  await TestValidator.error(
    "last super admin self-demotion forbidden",
    async () => {
      await api.functional.ecommerceMall.admin.admins.demote(
        superAdminJoinConnection,
        {
          adminId: superAdminJoinResult.id,
          body: {
            reason: "Testing last super admin protection",
          } satisfies IEcommerceMallAdmin.IDemoteRequest,
        },
      );
    },
  );
}
