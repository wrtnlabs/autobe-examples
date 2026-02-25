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

export async function test_api_super_administrator_update_role_promotion_success(
  connection: api.IConnection,
): Promise<void> {
  // This test covers:
  // 1. Successful promotion of a regular admin to super admin
  // 2. Prevention of self-demotion for super admin
  // 1. Create a super administrator and authenticate
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdminAuth = await authorize_super_administrator_join(
    superAdminConnection,
    {},
  );
  typia.assert(superAdminAuth);
  superAdminConnection.headers = {
    Authorization: `Bearer ${superAdminAuth.token.access}`,
  };
  // 2. Assume a regular administrator exists to promote
  // To simulate, create a new super administrator and demote to regular for test
  // If no utility to create regular admin, emulate with join then demote
  // Here we create another super admin to promote later after demotion
  const anotherSuperAdminConnection: api.IConnection = {
    host: connection.host,
  };
  const anotherSuperAdminAuth = await authorize_super_administrator_join(
    anotherSuperAdminConnection,
    {},
  );
  typia.assert(anotherSuperAdminAuth);
  anotherSuperAdminConnection.headers = {
    Authorization: `Bearer ${anotherSuperAdminAuth.token.access}`,
  };
  // Demote this new super admin to regular administrator (simulate as demotion)
  const demoteBody: IDiscussionBoardSuperAdministrator.IRoleUpdate = {
    administratorId: anotherSuperAdminAuth.id,
    action: "demote",
  };
  const demoteResponse =
    await api.functional.discussionBoard.superAdministrators.updateRole(
      superAdminConnection,
      { body: demoteBody },
    );
  typia.assert(demoteResponse);
  TestValidator.equals("demotion success", demoteResponse.success, true);
  TestValidator.equals(
    "demoted admin id matches",
    demoteResponse.updatedAdministrator.id,
    anotherSuperAdminAuth.id,
  );
  // 3. Now attempt to promote the regular administrator back to super admin
  const promoteBody: IDiscussionBoardSuperAdministrator.IRoleUpdate = {
    administratorId: anotherSuperAdminAuth.id,
    action: "promote",
  };
  const promoteResponse =
    await api.functional.discussionBoard.superAdministrators.updateRole(
      superAdminConnection,
      { body: promoteBody },
    );
  typia.assert(promoteResponse);
  TestValidator.equals("promotion success", promoteResponse.success, true);
  TestValidator.equals(
    "promoted admin id matches",
    promoteResponse.updatedAdministrator.id,
    anotherSuperAdminAuth.id,
  );
  // 4. Attempt self-demotion (should fail)
  const selfDemoteBody: IDiscussionBoardSuperAdministrator.IRoleUpdate = {
    administratorId: superAdminAuth.id,
    action: "demote",
  };
  await TestValidator.error("self-demotion forbidden", async () => {
    await api.functional.discussionBoard.superAdministrators.updateRole(
      superAdminConnection,
      { body: selfDemoteBody },
    );
  });
}
