import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicPoliticalDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalDiscussionBoardAdmin";
import type { IEconomicPoliticalDiscussionBoardBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalDiscussionBoardBan";
import type { IEconomicPoliticalDiscussionBoardProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalDiscussionBoardProfile";
import type { IEconomicPoliticalDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { generate_random_economic_political_discussion_board_admin_bans_create } from "../../../generate/generate_random_economic_political_discussion_board_admin_bans_create";
import { prepare_random_economic_political_discussion_board_ban } from "../../../prepare/prepare_random_economic_political_discussion_board_ban";

export async function test_api_user_profile_banned_access(
  connection: api.IConnection,
): Promise<void> {
  // Admin authentication setup
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      href: "http://test.com",
      referrer: "http://test.com",
    } satisfies IEconomicPoliticalDiscussionBoardAdmin.IJoin,
  });
  // Create a test user to be banned
  const userId = typia.random<string & tags.Format<"uuid">>();
  // Ban the newly created user
  const ban =
    await generate_random_economic_political_discussion_board_admin_bans_create(
      adminConnection,
      {
        body: {
          reason: "Testing banned profile access",
          user_id: userId,
        } satisfies IEconomicPoliticalDiscussionBoardBan.ICreate,
      },
    );
  typia.assert(ban);
  // Get the banned user's profile
  const userProfile =
    await api.functional.economicPoliticalDiscussionBoard.users.getByUserid(
      adminConnection,
      {
        userId,
      },
    );
  typia.assert(userProfile);
  // Verify profile contains deleted_at timestamp indicating ban
  TestValidator.notEquals(
    "Profile has deleted_at value",
    userProfile.deleted_at,
    null,
  );
}
