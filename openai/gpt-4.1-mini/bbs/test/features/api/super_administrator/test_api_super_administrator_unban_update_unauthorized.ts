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

export async function test_api_super_administrator_unban_update_unauthorized(
  connection: api.IConnection,
): Promise<void> {
  // This test scenario validates that an unauthorized user (not a super administrator) cannot update an unban record.
  // It attempts the update operation without necessary authentication or incorrect role and expects HTTP 403 Forbidden error.
  // Setup - Create a fresh connection without authorization header
  const unauthorizedConnection: api.IConnection = { host: connection.host };
  // Random UUID as unbanId and random update body
  const unbanId = typia.random<string & tags.Format<"uuid">>();
  const body: IDiscussionBoardUserUnban.IUpdate = {
    reason: `Updated for test_${RandomGenerator.alphaNumeric(8)}`,
  };
  // Attempt update without any authorization
  await TestValidator.httpError(
    "unauthorized update without login",
    403,
    async () => {
      await api.functional.discussionBoard.superAdministrator.administrator.unbans.updateUnban(
        unauthorizedConnection,
        {
          unbanId,
          body,
        },
      );
    },
  );
  // Optionally, attempt with a connection with no super administrator privileges (reuse base connection with no auth)
  // Expecting the same authorization error
  await TestValidator.httpError(
    "unauthorized update with invalid role",
    403,
    async () => {
      await api.functional.discussionBoard.superAdministrator.administrator.unbans.updateUnban(
        connection,
        {
          unbanId,
          body,
        },
      );
    },
  );
}
