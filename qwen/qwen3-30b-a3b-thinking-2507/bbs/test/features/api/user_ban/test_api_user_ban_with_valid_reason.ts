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

export async function test_api_user_ban_with_valid_reason(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin setup
  const adminConnection: api.IConnection = { host: connection.host };
  const authResult = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
      href: "http://localhost/auth/admin/join",
      referrer: "http://localhost/auth/admin",
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IEconomyPoliticsBoardAdmin.IJoin,
  });
  // 2. Create ban with descriptive reason of at least 20 characters
  const userId = typia.random<string & tags.Format<"uuid">>();
  const reason = RandomGenerator.paragraph({ sentences: 3 });
  const ban =
    await generate_random_economy_politics_board_admin_users_bans_create(
      adminConnection,
      {
        params: { userId },
        body: {
          reason: reason,
          expire_at: null,
        },
      },
    );
  typia.assert(ban);
  // 3. Verify ban record
  TestValidator.predicate("reason length >= 20", reason.length >= 20);
  TestValidator.equals("reason matches input", reason, ban.reason);
  // start_at timestamp should be recent
  const startAt = new Date(ban.start_at);
  const now = new Date();
  const timeDifference = Math.abs(now.getTime() - startAt.getTime());
  TestValidator.predicate(
    "start_at is recent timestamp",
    timeDifference < 1000 * 60 * 5,
  ); // within 5 minutes
  // Verify admin reference
  TestValidator.equals("admin id matches", authResult.id, ban.admin.id);
}
