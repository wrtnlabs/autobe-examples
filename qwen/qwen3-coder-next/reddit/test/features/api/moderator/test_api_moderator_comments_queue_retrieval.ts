import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformComment";
import type { IRedditPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformComment";
import type { IRedditPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformModerator";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_moderator_join } from "../../../authorize/authorize_moderator_join";
import { authorize_moderator_login } from "../../../authorize/authorize_moderator_login";
import { authorize_moderator_refresh } from "../../../authorize/authorize_moderator_refresh";

export async function test_api_moderator_comments_queue_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create moderator account
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderator = await api.functional.redditPlatform.auth.moderator.join(
    moderatorConnection,
    {
      body: typia.random<IRedditPlatformModerator.IJoin>(),
    },
  );
  typia.assert(moderator);
  // 2. Call the comments queue endpoint
  const result =
    await api.functional.redditPlatform.moderator.comments.queue.index(
      moderatorConnection,
    );
  typia.assert(result);
  // 3. Validate pagination structure
  TestValidator.equals(
    "current page is positive",
    result.pagination.current > 0,
    true,
  );
  TestValidator.equals("limit is positive", result.pagination.limit > 0, true);
  TestValidator.equals(
    "records is non-negative",
    result.pagination.records >= 0,
    true,
  );
  TestValidator.equals(
    "pages is non-negative",
    result.pagination.pages >= 0,
    true,
  );
  // 4. Validate data array structure
  TestValidator.equals("data is array", Array.isArray(result.data), true);
}
