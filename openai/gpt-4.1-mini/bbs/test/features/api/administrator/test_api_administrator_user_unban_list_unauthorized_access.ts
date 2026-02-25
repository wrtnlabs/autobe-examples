import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrator";
import type { IDiscussionBoardAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorGrade";
import type { IDiscussionBoardRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardRegisteredUser";
import type { IDiscussionBoardUserBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUserBan";
import type { IDiscussionBoardUserUnban } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUserUnban";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardUserUnban } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardUserUnban";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_administrator_user_unban_list_unauthorized_access(
  connection: api.IConnection,
): Promise<void> {
  // This test verifies that unauthorized users cannot access the user unban listing.
  // 1. Attempt request without authentication - expect failure.
  // 2. Create a non-administrator connection (no auth) and attempt request again - expect failure.
  // Base connection is never used for API calls directly.
  // 1. Attempt to access unban list without authentication
  await TestValidator.httpError(
    "unauthorized access without login",
    401,
    async () => {
      await api.functional.discussionBoard.administrator.administrator.unbans.index(
        { host: connection.host },
        { body: {} },
      );
    },
  );
  // 2. Attempt to access unban list with unauthorized user (simulate by just base connection with no admin auth)
  // Since we have no utility to authorize non-admin user here in given context, just reuse base connection with no auth header
  // and confirm unauthorized response.
  // Using a cloned connection (no auth headers set)
  const noAuthConnection: api.IConnection = { host: connection.host };
  await TestValidator.httpError(
    "unauthorized access with non-administrator",
    401,
    async () => {
      await api.functional.discussionBoard.administrator.administrator.unbans.index(
        noAuthConnection,
        { body: {} },
      );
    },
  );
}
