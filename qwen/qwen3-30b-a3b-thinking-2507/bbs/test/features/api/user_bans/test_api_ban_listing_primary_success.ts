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

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";

export async function test_api_ban_listing_primary_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authorize as user
  const userConnection: api.IConnection = { host: connection.host };
  await authorize_user_join(userConnection, {
    body: {} satisfies IEconomyPoliticsBoardUser.IJoin,
  });
  // 2. Get active bans
  const response =
    await api.functional.economyPoliticsBoard.user.bans.index(userConnection);
  typia.assert(response);
  // 3. Verify ban reason minimum length
  for (const ban of response.data) {
    TestValidator.predicate(
      "ban reason minimum 10 characters",
      ban.reason.length >= 10,
    );
  }
  // 4. Verify date formats are valid
  for (const ban of response.data) {
    TestValidator.predicate(
      "valid start date format",
      !isNaN(Date.parse(ban.start_at)),
    );
    if (ban.expire_at) {
      TestValidator.predicate(
        "valid expire date format",
        !isNaN(Date.parse(ban.expire_at)),
      );
      TestValidator.predicate(
        "expire date after start date",
        new Date(ban.expire_at) > new Date(ban.start_at),
      );
    }
  }
  // 5. Verify contextual details
  for (const ban of response.data) {
    // Verify banned user has details
    TestValidator.predicate("banned user has details", ban.bannedUser !== null);
    TestValidator.predicate(
      "banned user has email",
      ban.bannedUser.email.length > 0,
    );
    // Verify admin has details
    TestValidator.predicate("admin has details", ban.admin !== null);
    TestValidator.predicate("admin has email", ban.admin.email.length > 0);
  }
}
