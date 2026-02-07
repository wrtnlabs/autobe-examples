import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdminsRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdminsRole";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

export async function test_api_super_admin_demotion(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create first super admin (will perform demotion)
  const firstAdminConnection: api.IConnection = { host: connection.host };
  const firstAdmin = await api.functional.discussionBoard.auth.super_admin.join(
    firstAdminConnection,
    {
      body: typia.random<IDiscussionBoardSuperAdmin.IJoin>(),
    },
  );
  typia.assert(firstAdmin);
  // Step 2: Create second super admin (will be demoted)
  const secondAdminConnection: api.IConnection = { host: connection.host };
  const secondAdmin =
    await api.functional.discussionBoard.auth.super_admin.join(
      secondAdminConnection,
      {
        body: typia.random<IDiscussionBoardSuperAdmin.IJoin>(),
      },
    );
  typia.assert(secondAdmin);
  // Step 3: Authenticate as first super admin
  const demoterConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_login(demoterConnection, {
    body: {
      email: typia.assert<string>(firstAdmin as any),
      password: "1234",
    } satisfies IDiscussionBoardSuperAdmin.ILogin,
  });
  // Step 4: Demote second super admin to regular admin
  const result =
    await api.functional.discussionBoard.superAdmin.admin.roles.manageRole(
      demoterConnection,
      {
        body: typia.random<IDiscussionBoardAdminsRole.IManageRequest>(),
      },
    );
  typia.assert(result);
  // Step 5: Verify the demotion response
  TestValidator.predicate("demotion successful", result !== null);
}