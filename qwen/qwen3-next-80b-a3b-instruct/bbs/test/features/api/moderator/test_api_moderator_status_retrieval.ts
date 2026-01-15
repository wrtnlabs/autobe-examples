import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { prepare_random_discussion_board_user } from "../../../prepare/prepare_random_discussion_board_user";
import { generate_random_discussion_board_users_create } from "../../../generate/generate_random_discussion_board_users_create";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_moderator_status_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a citizen account that will be assigned moderator privileges
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(16);
  const username = RandomGenerator.alphaNumeric(8);
  const citizenConnection: api.IConnection = { host: connection.host };
  const citizen: IDiscussionBoardUser =
    await generate_random_discussion_board_users_create(citizenConnection, {
      body: {
        email,
        password,
        username,
      } satisfies IDiscussionBoardUser.ICreate,
    });
  typia.assert(citizen);
  // Step 2: Admin authenticates to assign moderator status to the citizen
  const adminConnection: api.IConnection = { host: connection.host };
  const admin: IAdmin.IAuthorized = await authorize_admin_join(
    adminConnection,
    {
      body: {
        email,
        password,
      } satisfies IAdmin.IJoin,
    },
  );
  typia.assert(admin);
  // Step 3: Authenticate as the newly assigned moderator (same identity as citizen)
  const moderatorConnection: api.IConnection = { host: connection.host };
  await authorize_admin_login(moderatorConnection, {
    body: {
      email,
      password,
    } satisfies IAdmin.ILogin,
  });
  // Step 4: Retrieve moderator status using the authenticated moderator connection
  const status: IDiscussionBoardModerator =
    await api.functional.discussionBoard.moderator.moderators.status.at(
      moderatorConnection,
      {
        moderatorId: admin.id,
      },
    );
  typia.assert(status);
  // Step 5: Validate that the retrieved status is active
  TestValidator.equals(
    "moderator status should be active",
    status.status,
    "active",
  );
}
