import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformModerationLog } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationLog";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
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
import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";
import { generate_random_community_platform_moderator_moderation_logs_create_moderation_log } from "../../../generate/generate_random_community_platform_moderator_moderation_logs_create_moderation_log";
import { prepare_random_community_platform_moderation_log } from "../../../prepare/prepare_random_community_platform_moderation_log";

export async function test_api_moderator_moderation_log_creation_unauthorized_access(
  connection: api.IConnection,
): Promise<void> {
  // 1. Prepare user actor connection with join and login
  const userConnection: api.IConnection = { host: connection.host };
  await authorize_user_join(userConnection, { body: {} });
  // Since ICommunityPlatformUser.ILogin is empty, log in with {}
  await authorize_user_login(userConnection, { body: {} });
  // 2. Attempt to create a moderation log as non-moderator user
  const invalidBody = typia.random<ICommunityPlatformModerationLog.ICreate>();
  await TestValidator.httpError(
    "unauthorized user cannot create moderation log",
    [401, 403],
    async () =>
      await api.functional.communityPlatform.moderator.moderation_logs.createModerationLog(
        userConnection,
        { body: invalidBody },
      ),
  );
}
