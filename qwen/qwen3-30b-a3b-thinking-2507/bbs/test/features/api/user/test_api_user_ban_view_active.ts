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

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";

export async function test_api_user_ban_view_active(
  connection: api.IConnection,
) {
  // 1. Create user to get authenticated connection
  const userConnection: api.IConnection = { host: connection.host };
  await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
      name: RandomGenerator.name(),
    } satisfies IEconomyPoliticsBoardUser.IJoin,
  });
  // 2. Test fetching a ban (using random UUID for ban ID)
  const banId = typia.random<string & tags.Format<"uuid">>();
  const ban = await api.functional.economyPoliticsBoard.user.bans.at(
    userConnection,
    {
      banId: banId,
    },
  );
  typia.assert(ban);
  // 3. Validate ban details
  TestValidator.predicate(
    "ban reason has minimum 10 characters",
    ban.reason.length >= 10,
  );
  TestValidator.predicate(
    "start_at timestamp exists",
    ban.start_at !== undefined,
  );
  TestValidator.predicate("admin user ID exists", ban.admin.id !== undefined);
  TestValidator.equals("ban is active - no deleted_at", ban.deleted_at, null);
}
