import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IECommerceMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallAdministrator";
import type { IECommerceMallSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSuperAdministrator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";
import { authorize_super_administrator_join } from "../../../authorize/authorize_super_administrator_join";
import { authorize_super_administrator_login } from "../../../authorize/authorize_super_administrator_login";
import { authorize_super_administrator_refresh } from "../../../authorize/authorize_super_administrator_refresh";

export async function test_api_super_administrator_self_demotion_prohibited(
  connection: api.IConnection,
): Promise<void> {
  // 1. Login as the pre-seeded super administrator
  const seedConnection: api.IConnection = { host: connection.host };
  const seed = await authorize_super_administrator_login(seedConnection, {
    body: {
      email: "admin@test.com",
      password: "password",
      href: "https://example.com/login",
      referrer: "https://example.com/",
    } satisfies IECommerceMallSuperAdministrator.ILogin,
  });
  typia.assert(seed);
  // 2. Create a regular administrator account
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IECommerceMallAdministrator.IJoin,
  });
  typia.assert(admin);
  // 3. Promote the regular administrator to super administrator using seed super admin auth
  // After this call, seedConnection.headers.Authorization becomes the promoted admin's token
  const promoted = await authorize_super_administrator_join(seedConnection, {
    body: {
      administrator_id: admin.id,
    },
  });
  typia.assert(promoted);
  // 4. Attempt self-demotion — the promoted super admin tries to demote their own underlying admin account
  // This should fail because the authenticated super admin's underlying administrator_id matches the target
  await TestValidator.httpError(
    "self-demotion should be prohibited",
    [422, 409],
    async () => {
      await api.functional.eCommerceMall.superAdministrator.administrators.demote(
        seedConnection,
        {
          administratorId: promoted.administrator.id,
        },
      );
    },
  );
}
