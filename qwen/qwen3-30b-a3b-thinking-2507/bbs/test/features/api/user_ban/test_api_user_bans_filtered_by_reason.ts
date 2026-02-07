import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomyPoliticsBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomyPoliticsBoardAdmin";
import type { IEconomyPoliticsBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomyPoliticsBoardUser";
import type { IEconomyPoliticsBoardUserBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomyPoliticsBoardUserBan";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEconomyPoliticsBoardUserBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEconomyPoliticsBoardUserBan";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_user_bans_filtered_by_reason(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin authentication
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      href: "http://test",
      referrer: "http://test",
      ip: "127.0.0.1",
    } satisfies IEconomyPoliticsBoardAdmin.IJoin,
  });
  // 2. Get user ID
  const userId: string = typia.random<string & tags.Format<"uuid">>();
  // 3. Filter bans with reason = 'user_ban_spamming' (17 characters)
  const response: IPageIEconomyPoliticsBoardUserBan.ISummary =
    await api.functional.economyPoliticsBoard.admin.users.bans.index(
      adminConnection,
      {
        userId,
        body: {
          reason: "user_ban_spamming",
        } satisfies IEconomyPoliticsBoardUserBan.IRequest,
      },
    );
  typia.assert(response);
  // 4. Validate all returned bans have the correct reason
  for (const ban of response.data) {
    TestValidator.equals(
      "bans should have correct reason",
      ban.reason,
      "user_ban_spamming",
    );
  }
}
