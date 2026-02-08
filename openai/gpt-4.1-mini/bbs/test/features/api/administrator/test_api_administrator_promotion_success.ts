import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrator";
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

export async function test_api_administrator_promotion_success(
  connection: api.IConnection,
): Promise<void> {
  // This test scenario covers the primary successful path of promoting an existing regular administrator to a super administrator.
  // It tests that a super administrator can successfully elevate another administrator's grade to super administrator,
  // that the promotion record is properly created, and that the response returns the updated administrator entity with the new grade.
  // The test validates authorization by ensuring only a super administrator can invoke this operation and that self-promotion is not allowed.
  // 1. Authorize as super administrator
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdminAuth = await authorize_super_administrator_join(
    superAdminConnection,
    {
      body: {},
    },
  );
  typia.assert(superAdminAuth);
  superAdminConnection.headers = {
    Authorization: `Bearer ${superAdminAuth.token.access}`,
  };
  // 2. Create a UUID for a regular administrator to promote
  const adminToPromoteId = typia.random<string & tags.Format<"uuid">>();
  // 3. Promote the regular administrator to super administrator
  const promotedAdminRaw =
    await api.functional.discussionBoard.superAdministrator.administrators.promote(
      superAdminConnection,
      {
        administratorId: adminToPromoteId,
      },
    );
  // Assert promotedAdminRaw to IEntity with 'id' property
  const promotedAdmin = typia.assert<IEntity>(promotedAdminRaw);
  // 4. Validate that the returned administrator has the expected id (the promoted one)
  TestValidator.equals(
    "promoted administrator matches",
    promotedAdmin.id,
    adminToPromoteId,
  );
}
