import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomyPoliticsBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomyPoliticsBoardAdmin";
import type { IEconomyPoliticsBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomyPoliticsBoardUser";
import type { IEconomyPoliticsBoardUserBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomyPoliticsBoardUserBan";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { generate_random_economy_politics_board_admin_users_bans_create } from "../../../generate/generate_random_economy_politics_board_admin_users_bans_create";
import { prepare_random_economy_politics_board_user_ban } from "../../../prepare/prepare_random_economy_politics_board_user_ban";

export async function test_api_user_ban_at_min_reason_length(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_login(adminConnection, {
    body: {
      email: "admin@test.com",
      password: "1234",
    },
  });
  // Generate ban with exactly 10-character reason (minimum requirement)
  const ban =
    await generate_random_economy_politics_board_admin_users_bans_create(
      adminConnection,
      {
        body: {
          reason: "a".repeat(10),
        },
        params: {
          userId: typia.random<string & tags.Format<"uuid">>(),
        },
      },
    );
  // Validate ban creation
  typia.assert(ban);
  TestValidator.equals("reason length", ban.reason.length, 10);
  TestValidator.equals("ban reason matches", ban.reason, "aaaaaaaaaa");
}
