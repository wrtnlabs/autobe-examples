import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformModerationLog } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationLog";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformModerationLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformModerationLog";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_moderator_join } from "../../../authorize/authorize_moderator_join";
import { authorize_moderator_login } from "../../../authorize/authorize_moderator_login";
import { authorize_moderator_refresh } from "../../../authorize/authorize_moderator_refresh";

export async function test_api_community_platform_moderation_logs_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Moderator login (join)
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderator = await authorize_moderator_join(moderatorConnection, {
    body: {} satisfies ICommunityPlatformModerator.IJoin,
  });
  moderatorConnection.headers ??= {};
  moderatorConnection.headers.Authorization = `Bearer ${moderator.token.access}`;
  // 2. Retrieve moderation logs using authorized moderatorConnection
  const moderationLogs =
    await api.functional.communityPlatform.moderator.moderation_logs.get(
      moderatorConnection,
    );
  typia.assert(moderationLogs);
  // 3. Validate pagination metadata
  TestValidator.predicate(
    "pagination current page is non-negative",
    moderationLogs.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination limit is non-negative",
    moderationLogs.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "pagination pages count is non-negative",
    moderationLogs.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "pagination records count is non-negative",
    moderationLogs.pagination.records >= 0,
  );
  // 4. Skipping validation of sorting by timestamp as 'createdAt' does not exist in type ICommunityPlatformModerationLog
  // 5. Confirm unauthorized access is forbidden (HTTP 401)
  await TestValidator.httpError(
    "unauthorized access to moderation logs",
    401,
    async () => {
      await api.functional.communityPlatform.moderator.moderation_logs.get(
        connection,
      );
    },
  );
}
