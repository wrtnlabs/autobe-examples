import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformModerationLog } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationLog";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_moderator_join } from "../../../authorize/authorize_moderator_join";
import { authorize_moderator_login } from "../../../authorize/authorize_moderator_login";
import { authorize_moderator_refresh } from "../../../authorize/authorize_moderator_refresh";

export async function test_api_moderation_logs_access_denied_for_unauthorized_user(
  connection: api.IConnection,
): Promise<void> {
  // Moderator join to enable authorized context, though not used for main unauthorized tests
  const moderatorJoinConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_moderator_join(moderatorJoinConnection, {
    body: {},
  });
  typia.assert(authorized);
  // Create connection without authorization header (unauthorized user)
  const unauthorizedConnection: api.IConnection = { host: connection.host };
  // Try accessing moderation log without any token
  await TestValidator.httpError(
    "access moderation log without token should be denied",
    401,
    async () => {
      await api.functional.communityPlatform.moderator.moderation_logs.at(
        unauthorizedConnection,
        {
          moderationLogId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );
  // Create connection with invalid token header
  const fakeTokenConnection: api.IConnection = {
    host: connection.host,
    headers: { Authorization: `Bearer fake.invalid.token` },
  };
  // Try accessing moderation log with invalid token
  await TestValidator.httpError(
    "access moderation log with invalid token should be denied",
    401,
    async () => {
      await api.functional.communityPlatform.moderator.moderation_logs.at(
        fakeTokenConnection,
        {
          moderationLogId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );
}
