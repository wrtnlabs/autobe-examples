import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformModerationLog } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationLog";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_moderator_join } from "../../../authorize/authorize_moderator_join";
import { authorize_moderator_login } from "../../../authorize/authorize_moderator_login";
import { authorize_moderator_refresh } from "../../../authorize/authorize_moderator_refresh";

export async function test_api_moderation_log_retrieval_not_found(
  connection: api.IConnection,
): Promise<void> {
  // 1. Prepare actor connection and authenticate as moderator by joining
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderatorAuthorized = await authorize_moderator_join(
    moderatorConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        username: RandomGenerator.name(1),
        displayName: null,
        bio: null,
        avatarUrl: null,
      },
    },
  );
  typia.assert(moderatorAuthorized);
  // Attach Authorization header with access token
  moderatorConnection.headers = {
    Authorization: `Bearer ${moderatorAuthorized.token.access}`,
  };
  // 2. Generate a random UUID that does not exist in the database
  const nonExistentModerationLogId = typia.random<
    string & tags.Format<"uuid">
  >();
  // 3. Try to retrieve the moderation log by non-existent ID, expect 404 error
  await TestValidator.httpError(
    "moderation log retrieval with non-existent UUID should fail with 404",
    404,
    async () => {
      await api.functional.communityPlatform.moderator.moderationLogs.at(
        moderatorConnection,
        { moderationLogId: nonExistentModerationLogId },
      );
    },
  );
  // 4. Try to retrieve with invalid UUID format, expect 400 or 404 error
  const invalidUuid = "invalid-uuid-format";
  await TestValidator.httpError(
    "moderation log retrieval with invalid UUID should fail with 404 or 400",
    [400, 404],
    async () => {
      await api.functional.communityPlatform.moderator.moderationLogs.at(
        moderatorConnection,
        { moderationLogId: invalidUuid },
      );
    },
  );
}
