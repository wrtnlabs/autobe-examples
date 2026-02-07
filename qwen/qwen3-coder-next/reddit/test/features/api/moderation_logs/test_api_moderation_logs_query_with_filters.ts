import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditPlatformModerationLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformModerationLog";
import type { IRedditPlatformModerationLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformModerationLog";
import type { IRedditPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformModerator";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_moderator_join } from "../../../authorize/authorize_moderator_join";
import { authorize_moderator_login } from "../../../authorize/authorize_moderator_login";
import { authorize_moderator_refresh } from "../../../authorize/authorize_moderator_refresh";

export async function test_api_moderation_logs_query_with_filters(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create moderator and authenticate
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderator = await authorize_moderator_join(moderatorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      name: RandomGenerator.name(),
    } satisfies IRedditPlatformModerator.IJoin,
  });
  typia.assert(moderator);
  // 2. Query moderation logs with various filters
  const logs =
    await api.functional.redditPlatform.moderator.moderation_logs.index(
      moderatorConnection,
      {
        body: typia.random<IRedditPlatformModerationLog.IRequest>(),
      },
    );
  typia.assert(logs);
  // 3. Validate response structure
  TestValidator.equals("has pagination", typeof logs.pagination, "object");
  TestValidator.equals(
    "pagination properties exist",
    logs.pagination.current >= 0 && logs.pagination.limit >= 0,
    true,
  );
  TestValidator.equals("data array exists", Array.isArray(logs.data), true);
  // 4. Validate pagination structure
  TestValidator.equals(
    "current page is valid",
    logs.pagination.current > 0,
    true,
  );
  TestValidator.equals("limit is positive", logs.pagination.limit > 0, true);
  TestValidator.equals(
    "records count is non-negative",
    logs.pagination.records >= 0,
    true,
  );
  TestValidator.equals(
    "pages count is non-negative",
    logs.pagination.pages >= 0,
    true,
  );
}
