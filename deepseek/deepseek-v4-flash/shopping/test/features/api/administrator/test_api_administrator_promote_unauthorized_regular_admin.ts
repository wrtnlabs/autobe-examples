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

export async function test_api_administrator_promote_unauthorized_regular_admin(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin1 (regular administrator who will attempt to promote)
  const admin1Email = typia.random<string & tags.Format<"email">>();
  const admin1Password = RandomGenerator.alphaNumeric(16);
  const admin1Connection: api.IConnection = { host: connection.host };
  const authorized1 = await authorize_administrator_join(admin1Connection, {
    body: {
      email: admin1Email,
      password: admin1Password,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IECommerceMallAdministrator.IJoin,
  });
  typia.assert(authorized1);
  // 2. Create admin2 (regular administrator who will be the target of promotion)
  const admin2Email = typia.random<string & tags.Format<"email">>();
  const admin2Password = RandomGenerator.alphaNumeric(16);
  const admin2JoinConnection: api.IConnection = { host: connection.host };
  const authorized2 = await authorize_administrator_join(admin2JoinConnection, {
    body: {
      email: admin2Email,
      password: admin2Password,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IECommerceMallAdministrator.IJoin,
  });
  typia.assert(authorized2);
  // 3. Admin1 attempts to promote admin2 — expect 403 Forbidden
  await TestValidator.httpError(
    "regular admin cannot promote another admin",
    403,
    async () => {
      await api.functional.eCommerceMall.superAdministrator.administrators.promote(
        admin1Connection,
        {
          administratorId: authorized2.id,
        },
      );
    },
  );
  // 4. Verify admin2's grade remains 'administrator' (not promoted to superAdministrator)
  const admin2LoginConnection: api.IConnection = { host: connection.host };
  const admin2Login = await authorize_administrator_login(
    admin2LoginConnection,
    {
      body: {
        email: admin2Email,
        password: admin2Password,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      } satisfies IECommerceMallAdministrator.ILogin,
    },
  );
  typia.assert(admin2Login);
  TestValidator.equals(
    "admin2 grade remains administrator",
    admin2Login.grade,
    "administrator",
  );
}
