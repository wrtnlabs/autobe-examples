import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrator";
import type { IDiscussionBoardAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorGrade";
import type { IDiscussionBoardRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardRegisteredUser";
import type { IDiscussionBoardSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdministrator";
import type { IDiscussionBoardUserBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUserBan";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_administrator_join } from "../../../authorize/authorize_super_administrator_join";
import { authorize_super_administrator_login } from "../../../authorize/authorize_super_administrator_login";
import { authorize_super_administrator_refresh } from "../../../authorize/authorize_super_administrator_refresh";
import { generate_random_discussion_board_super_administrator_administrator_bans_create } from "../../../generate/generate_random_discussion_board_super_administrator_administrator_bans_create";
import { prepare_random_discussion_board_user_ban } from "../../../prepare/prepare_random_discussion_board_user_ban";

export async function test_api_user_ban_creation_with_nonexistent_user(
  connection: api.IConnection,
): Promise<void> {
  // 1. Super administrator join and authenticate
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdmin = await authorize_super_administrator_join(
    superAdminConnection,
    {
      body: {
        email: `admin_nonexistent_${RandomGenerator.alphaNumeric(8)}@example.com`,
        password: RandomGenerator.alphaNumeric(16),
        href: "https://example.com/join",
        referrer: "https://example.com/referrer",
        ip: null,
      },
    },
  );
  typia.assert(superAdmin);
  // After login, set the Authorization header with the access token
  superAdminConnection.headers = {
    Authorization: `Bearer ${superAdmin.token.access}`,
  };
  // 2. Attempt to ban a non-existent user ID
  const nonExistentUserId = typia.random<string & tags.Format<"uuid">>();
  const banCreateBody = {
    registeredUserId: nonExistentUserId,
    reason: "Attempt to ban non-existent user for test",
  } satisfies IDiscussionBoardUserBan.ICreate;
  // 3. Attempt and expect an error
  await TestValidator.error(
    "ban creation with non-existent user should fail",
    async () => {
      await api.functional.discussionBoard.superAdministrator.administrator.bans.create(
        superAdminConnection,
        {
          body: banCreateBody,
        },
      );
    },
  );
}
