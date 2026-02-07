import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformUser";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";

export async function test_api_statistics_response_structure(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create actor-specific connection and authenticate user
  const userConnection: api.IConnection = { host: connection.host };
  const auth = await authorize_user_join(userConnection, {
    body: typia.random<IRedditPlatformUser.IJoin>(),
  });
  typia.assert(auth);
  // 2. Call the statistics endpoint
  const statistics =
    await api.functional.redditPlatform.user.statistics.index(userConnection);
  typia.assert(statistics);
  // 3. Validate response structure
  // ISummary is defined as an empty object {}, so validate it's a valid object
  TestValidator.predicate(
    "statistics is an object",
    typeof statistics === "object",
  );
  TestValidator.predicate("statistics is not null", statistics !== null);
  TestValidator.predicate(
    "statistics has expected structure",
    statistics !== undefined,
  );
}
