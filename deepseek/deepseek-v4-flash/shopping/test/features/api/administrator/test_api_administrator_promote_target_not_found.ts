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

export async function test_api_administrator_promote_target_not_found(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a regular administrator (admin1)
  const admin1Connection: api.IConnection = { host: connection.host };
  const admin1 = await authorize_administrator_join(admin1Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123!",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IECommerceMallAdministrator.IJoin,
  });
  typia.assert(admin1);
  // Step 2: Promote admin1 to super administrator
  const superAdminEmail = typia.random<string & tags.Format<"email">>();
  const superAdminPassword = "superPassword123!";
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdmin = await authorize_super_administrator_join(
    superAdminConnection,
    {
      body: {
        administrator_id: admin1.id,
        email: superAdminEmail,
        password: superAdminPassword,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      },
    },
  );
  typia.assert(superAdmin);
  // Step 3: Test promote with non-existent UUID
  const nonExistentUuid = "00000000-0000-0000-0000-000000000000";
  await TestValidator.httpError(
    "promote non-existent administrator returns 404",
    404,
    async () => {
      await api.functional.eCommerceMall.superAdministrator.administrators.promote(
        superAdminConnection,
        {
          administratorId: nonExistentUuid,
        },
      );
    },
  );
  // Step 4: Verify super admin can still login after the failed attempt
  const verifyConnection: api.IConnection = { host: connection.host };
  const loginResult = await authorize_super_administrator_login(
    verifyConnection,
    {
      body: {
        email: superAdminEmail,
        password: superAdminPassword,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IECommerceMallSuperAdministrator.ILogin,
    },
  );
  typia.assert(loginResult);
}
