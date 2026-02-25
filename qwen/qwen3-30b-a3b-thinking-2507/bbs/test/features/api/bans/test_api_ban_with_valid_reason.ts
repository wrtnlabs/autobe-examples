import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicPoliticalDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalDiscussionBoardAdmin";
import type { IEconomicPoliticalDiscussionBoardBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalDiscussionBoardBan";
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

export async function test_api_ban_with_valid_reason(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin connection
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: "admin@example.com",
      href: "https://example.com",
      referrer: "https://example.com",
      ip: "127.0.0.1",
    } satisfies IEconomicPoliticalDiscussionBoardAdmin.IJoin,
  });
  // 2. Generate valid data
  const reason = typia.random<string & tags.MinLength<10>>();
  const user_id = typia.random<string & tags.Format<"uuid">>();
  // 3. Create ban
  const ban =
    await generate_random_economic_political_discussion_board_admin_bans_create(
      adminConnection,
      {
        body: {
          reason,
          user_id,
        } satisfies IEconomicPoliticalDiscussionBoardBan.ICreate,
      },
    );
  typia.assert(ban);
  // 4. Validate response
  TestValidator.equals("reason matches input", ban.reason, reason);
  TestValidator.equals("user_id matches input", ban.user.id, user_id);
  TestValidator.equals("ban status active", ban.active, true);
}
