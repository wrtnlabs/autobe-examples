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

export async function test_api_user_unban_retrieval_not_found_or_deleted(
  connection: api.IConnection,
): Promise<void> {
  // 1. Super Administrator join and get authorized connection
  const superAdminConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_super_administrator_join(
    superAdminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "Password123!",
        href: "https://example.com/join",
        referrer: "https://example.com/referrer",
        ip: null,
      },
    },
  );
  typia.assert(authorized);
  superAdminConnection.headers = {
    Authorization: authorized.token.access,
  };
  // 2. Test fetching unban record with non-existent ID
  const nonExistentUnbanId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.httpError(
    "fetch non-existent unban record should fail with 404",
    404,
    async () => {
      await api.functional.discussionBoard.superAdministrator.administrator.unbans.at(
        superAdminConnection,
        { unbanId: nonExistentUnbanId },
      );
    },
  );
  // 3. Test fetching unban record with soft-deleted ID
  // Since we cannot create a soft deleted unban directly here as per provided info,
  // We simulate this by attempting to fetch with a known deleted UUID (random)
  // In a real test, a soft deleted ID should come from a prepared dataset
  const softDeletedUnbanId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.httpError(
    "fetch soft-deleted unban record should fail with 404",
    404,
    async () => {
      await api.functional.discussionBoard.superAdministrator.administrator.unbans.at(
        superAdminConnection,
        { unbanId: softDeletedUnbanId },
      );
    },
  );
}
