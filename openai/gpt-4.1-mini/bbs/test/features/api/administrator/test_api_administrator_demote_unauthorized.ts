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

export async function test_api_administrator_demote_unauthorized(
  connection: api.IConnection,
): Promise<void> {
  // Description:
  // Test that demotion operation fails when attempted by a user who is not a super administrator.
  // Try to call demote endpoint using insufficient privileges and verify rejection due to authorization failure.
  // Create a connection for a user who is NOT a super administrator - we only have superAdministrator join utility available,
  // so we simulate a normal admin connection by creating a connection without super admin authorization.
  // Use a random administratorId to try demotion.
  const userConnection: api.IConnection = { host: connection.host };
  const randomAdministratorId = typia.random<string & tags.Format<"uuid">>();
  // Attempt to call the demote endpoint using userConnection (no super admin auth)
  await TestValidator.httpError(
    "demote fails for unauthorized user",
    401,
    async () => {
      await api.functional.discussionBoard.superAdministrator.administrators.demote(
        userConnection,
        { administratorId: randomAdministratorId },
      );
    },
  );
}
