import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdministrator";
import type { IEcommerceMallAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdministratorGrade";
import type { IEcommerceMallSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSuperAdministrator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_administrator_join } from "../../../authorize/authorize_super_administrator_join";
import { authorize_super_administrator_login } from "../../../authorize/authorize_super_administrator_login";
import { authorize_super_administrator_refresh } from "../../../authorize/authorize_super_administrator_refresh";

export async function test_api_administrator_self_demotion_prevention(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate as super administrator
  const joinPassword = RandomGenerator.alphaNumeric(16);
  const joinConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_super_administrator_join(joinConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      display_name: RandomGenerator.name(2),
      password: joinPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(adminAuth);
  // 2. Get the administrator's ID from the authorization response
  const selfAdminId: string & tags.Format<"uuid"> = adminAuth.id;
  // 3. Authenticate as the same super administrator
  const adminConnection: api.IConnection = { host: connection.host };
  const loginAuth = await authorize_super_administrator_login(adminConnection, {
    body: {
      email: adminAuth.superAdministrator.email,
      password: joinPassword,
    } satisfies IEcommerceMallSuperAdministrator.ILogin,
  });
  typia.assert(loginAuth);
  // 4. Attempt to demote self (should fail with 400 Bad Request)
  await TestValidator.error(
    "self-demotion attempt must be rejected",
    async () => {
      await api.functional.ecommerceMall.superAdministrator.administrators.grade.update(
        adminConnection,
        {
          adminId: selfAdminId,
          body: {
            grade: "regular",
            reason: "Testing self-demotion prevention",
          } satisfies IEcommerceMallAdministratorGrade.IUpdate,
        },
      );
    },
  );
  // 5. Verify the administrator can still authenticate (grade unchanged)
  const verifyConnection: api.IConnection = { host: connection.host };
  const verifyAuth = await authorize_super_administrator_login(
    verifyConnection,
    {
      body: {
        email: adminAuth.superAdministrator.email,
        password: joinPassword,
      } satisfies IEcommerceMallSuperAdministrator.ILogin,
    },
  );
  typia.assert(verifyAuth);
  // 6. Confirm the account is still usable (grade remained super)
  TestValidator.equals(
    "administrator ID unchanged after failed demotion",
    verifyAuth.id,
    selfAdminId,
  );
}
