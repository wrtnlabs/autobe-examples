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

export async function test_api_administrator_grade_self_demotion_prevention(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate a super administrator
  const joinConnection: api.IConnection = { host: connection.host };
  const auth = await authorize_super_administrator_join(joinConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      display_name: RandomGenerator.name(2),
      password: typia.random<string & tags.Format<"password"> & tags.MinLength<8>>() satisfies string as string & tags.Format<"password"> & tags.MinLength<8>,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>() ?? null,
    },
  });
  typia.assert(auth);
  // 2. Extract administrator ID from authorization response
  const adminId = auth.superAdministrator.id;
  // 3. Create connection with the super administrator's token
  const adminConnection: api.IConnection = { host: connection.host };
  adminConnection.headers = { Authorization: auth.token.access };
  // 4. Verify the administrator initially has 'super' grade by attempting to update their own grade to 'regular'
  // This should fail with an error due to self-demotion prevention
  await TestValidator.error(
    "super administrator cannot demote themselves",
    async () => {
      await api.functional.ecommerceMall.superAdministrator.administrator_grades.update(
        adminConnection,
        {
          body: {
            administrator_id: adminId,
            new_grade: "regular",
          } satisfies IEcommerceMallAdministratorGrade.IRequest,
        },
      );
    },
  );
}