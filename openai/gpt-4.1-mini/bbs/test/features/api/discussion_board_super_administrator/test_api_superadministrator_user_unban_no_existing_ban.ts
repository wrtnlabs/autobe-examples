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
import { generate_random_discussion_board_super_administrator_administrator_unbans_create_unban } from "../../../generate/generate_random_discussion_board_super_administrator_administrator_unbans_create_unban";
import { prepare_random_discussion_board_user_unban } from "../../../prepare/prepare_random_discussion_board_user_unban";

export async function test_api_superadministrator_user_unban_no_existing_ban(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as superAdministrator
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdminJoinResponse = await authorize_super_administrator_join(
    superAdminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "supersecurepassword",
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: null,
      },
    },
  );
  typia.assert(superAdminJoinResponse);
  // Update connection with auth token
  superAdminConnection.headers = {
    Authorization: `Bearer ${superAdminJoinResponse.token.access}`,
  };
  // 2. Prepare an unbanned registered user for this test.
  //    We'll generate random UUID as ban record id which doesn't exist in bans
  const fakeUserBanId = typia.random<string & tags.Format<"uuid">>();
  const fakeAdministratorId = typia.random<string & tags.Format<"uuid">>();
  const reason = "Attempt to unban user without existing ban record";
  // 3. Try to unban using nonexistent ban record id, expect error
  await TestValidator.error(
    "unban with no existing ban should fail",
    async () => {
      await api.functional.discussionBoard.superAdministrator.administrator.unbans.createUnban(
        superAdminConnection,
        {
          body: {
            userBanId: fakeUserBanId,
            administratorId: fakeAdministratorId,
            reason,
          } satisfies IDiscussionBoardUserUnban.ICreate,
        },
      );
    },
  );
}
