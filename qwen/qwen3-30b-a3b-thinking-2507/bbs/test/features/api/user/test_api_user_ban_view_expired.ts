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

export async function test_api_user_ban_view_expired(
  connection: api.IConnection,
): Promise<void> {
  // 1. Sign in as regular user
  const userConnection: api.IConnection = { host: connection.host };
  await authorize_user_join(userConnection, {
    body: {},
  });
  // 2. Fetch an expired ban; using a random UUID as ban ID
  const banId = typia.random<string & tags.Format<"uuid">>();
  const ban = await api.functional.economyPoliticsBoard.user.bans.at(
    userConnection,
    {
      banId,
    },
  );
  typia.assert(ban);
  // 3. Validate ban is expired (expire_at in past)
  if (ban.expire_at) {
    const expireAtDate = new Date(ban.expire_at);
    const currentDate = new Date();
    TestValidator.predicate(
      "ban expiration date should be in past",
      expireAtDate < currentDate,
    );
  } else {
    TestValidator.predicate(
      "expired ban should have expire_at property",
      false,
    );
  }
  // 4. Validate ban is still visible (deleted_at is null)
  TestValidator.equals(
    "ban should not be soft-deleted (still visible)",
    ban.deleted_at,
    null,
  );
}
