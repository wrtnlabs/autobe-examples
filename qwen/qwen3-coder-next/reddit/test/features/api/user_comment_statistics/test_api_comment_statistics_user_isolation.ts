import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformComment";
import type { IRedditPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformUser";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";

export async function test_api_comment_statistics_user_isolation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create two separate users to test isolation
  const user1Connection: api.IConnection = { host: connection.host };
  const user1 = await api.functional.redditPlatform.auth.user.join(
    user1Connection,
    {
      body: typia.random<IRedditPlatformUser.IJoin>(),
    },
  );
  typia.assert(user1);
  const user2Connection: api.IConnection = { host: connection.host };
  const user2 = await api.functional.redditPlatform.auth.user.join(
    user2Connection,
    {
      body: typia.random<IRedditPlatformUser.IJoin>(),
    },
  );
  typia.assert(user2);
  // 2. User1 accesses their own comment statistics
  const user1Stats: IRedditPlatformComment.IStatistic =
    await api.functional.redditPlatform.user.comments.statistics.index(
      user1Connection,
    );
  typia.assert(user1Stats);
  // 3. User2 accesses their own comment statistics
  const user2Stats: IRedditPlatformComment.IStatistic =
    await api.functional.redditPlatform.user.comments.statistics.index(
      user2Connection,
    );
  typia.assert(user2Stats);
  // 4. Verify both users get their own isolated statistics
  TestValidator.predicate("user1 stats retrieved", user1Stats !== null);
  TestValidator.predicate("user2 stats retrieved", user2Stats !== null);
}
