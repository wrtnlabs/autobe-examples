import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdministrator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_administrator_join } from "../../../authorize/authorize_super_administrator_join";
import { authorize_super_administrator_login } from "../../../authorize/authorize_super_administrator_login";
import { authorize_super_administrator_refresh } from "../../../authorize/authorize_super_administrator_refresh";

export async function test_api_super_administrator_update_role_demotion_by_another_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create first super administrator and obtain authorized connection
  const superAdmin1Connection: api.IConnection = { host: connection.host };
  const superAdmin1 = await authorize_super_administrator_join(
    superAdmin1Connection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "password123",
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: null,
      },
    },
  );
  typia.assert(superAdmin1);
  superAdmin1Connection.headers = {
    Authorization: `Bearer ${superAdmin1.token.access}`,
  };
  // 2. Create second super administrator and obtain authorized connection
  const superAdmin2Connection: api.IConnection = { host: connection.host };
  const superAdmin2 = await authorize_super_administrator_join(
    superAdmin2Connection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "password123",
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: null,
      },
    },
  );
  typia.assert(superAdmin2);
  superAdmin2Connection.headers = {
    Authorization: `Bearer ${superAdmin2.token.access}`,
  };
  // 3. Acting super administrator (superAdmin1) attempts to demote other super administrator (superAdmin2)
  const body: IDiscussionBoardSuperAdministrator.IRoleUpdate = {
    administratorId: superAdmin2.id,
    action: "demote",
  };
  const result =
    await api.functional.discussionBoard.superAdministrators.updateRole(
      superAdmin1Connection,
      { body },
    );
  typia.assert(result);
  // 4. Validate response success and fields
  TestValidator.predicate(
    "demotion success",
    result.success === true &&
      result.updatedAdministrator !== undefined &&
      result.updatedAdministrator.id === superAdmin2.id,
  );
  TestValidator.equals(
    "administrator id",
    result.updatedAdministrator.id,
    superAdmin2.id,
  );
  TestValidator.equals(
    "administrator email",
    result.updatedAdministrator.email,
    superAdmin2.email,
  );
  TestValidator.notEquals(
    "updatedAt is different",
    result.updatedAdministrator.updatedAt,
    superAdmin2.updatedAt,
  );
}
