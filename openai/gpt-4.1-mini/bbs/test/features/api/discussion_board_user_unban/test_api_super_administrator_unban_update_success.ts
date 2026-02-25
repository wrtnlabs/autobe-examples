import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrator";
import type { IDiscussionBoardAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorGrade";
import type { IDiscussionBoardRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardRegisteredUser";
import type { IDiscussionBoardSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdministrator";
import type { IDiscussionBoardUserBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUserBan";
import type { IDiscussionBoardUserUnban } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUserUnban";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_administrator_join } from "../../../authorize/authorize_super_administrator_join";
import { authorize_super_administrator_login } from "../../../authorize/authorize_super_administrator_login";
import { authorize_super_administrator_refresh } from "../../../authorize/authorize_super_administrator_refresh";

export async function test_api_super_administrator_unban_update_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as super administrator using provided utility
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdmin = await authorize_super_administrator_join(
    superAdminConnection,
    {},
  );
  // 2. Generate a random unbanId for update
  const unbanId = typia.random<string & tags.Format<"uuid">>();
  // 3. Prepare update body with a new reason
  const newReason = `Updated unban reason ${RandomGenerator.alphaNumeric(8)}`;
  const body = {
    reason: newReason,
  } satisfies IDiscussionBoardUserUnban.IUpdate;
  // 4. Call updateUnban utility function
  const updatedUnban =
    await api.functional.discussionBoard.superAdministrator.administrator.unbans.updateUnban(
      superAdminConnection,
      { unbanId, body },
    );
  typia.assert(updatedUnban);
  // 5. Assert unban id matches the requested unbanId
  TestValidator.equals("unban id unchanged", updatedUnban.id, unbanId);
  // 6. Assert createdAt and updatedAt are valid date-time strings
  typia.assert(updatedUnban.createdAt);
  typia.assert(updatedUnban.updatedAt);
  // 7. Assert reason updated
  TestValidator.equals("reason updated", updatedUnban.reason, newReason);
}
