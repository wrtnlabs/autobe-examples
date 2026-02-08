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

/**
 * Test access control for community platform moderation logs endpoint.
 *
 * This test verifies that only moderators with proper authorization
 * can access the moderation logs. It attempts to fetch moderation logs
 * as an unauthenticated user and expects a 401 Unauthorized or 403 Forbidden error.
 * Then it creates and authorizes a moderator, fetches logs successfully,
 * confirming the positive scenario.
 *
 * This ensures secure access enforcement to sensitive moderation data.
 */
export async function test_api_community_platform_moderation_logs_access_control(
  connection: api.IConnection,
): Promise<void> {
  // 1. Unauthenticated user tries to access moderation logs
  await TestValidator.httpError(
    "unauthenticated access denied",
    [401, 403],
    async () => {
      await api.functional.communityPlatform.moderator.moderation_logs.get(
        connection,
      );
    },
  );
  // 2. Moderator join to get authorization token
  const moderatorConnection: api.IConnection = { host: connection.host };
  await authorize_moderator_join(moderatorConnection, {
    body: {}, // ICommunityPlatformModerator.IJoin is empty
  });
  // Token is set internally by authorize_moderator_join
  // 3. Authorized moderator accesses moderation logs
  const output =
    await api.functional.communityPlatform.moderator.moderation_logs.get(
      moderatorConnection,
    );
  typia.assert(output);
  // Due to no further specification, confirm output has pagination and array properties
  TestValidator.predicate("pagination exists", output.pagination !== undefined);
  TestValidator.predicate("data array exists", Array.isArray(output.data));
}
