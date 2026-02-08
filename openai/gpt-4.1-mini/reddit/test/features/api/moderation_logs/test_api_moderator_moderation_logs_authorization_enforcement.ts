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

export async function test_api_moderator_moderation_logs_authorization_enforcement(
  connection: api.IConnection,
): Promise<void> {
  // Test authorization enforcement on accessing moderation logs.
  // Attempt to retrieve moderation logs without authenticating as a moderator.
  // Verify the API returns an authorization error response denying access.
  // Then authenticate as a moderator by joining.
  // Confirm the same request succeeds after authentication.
  // This validates that only authorized moderators can access sensitive moderation log data.
  // Create base connection for anonymous attempt
  const anonymousConnection: api.IConnection = { host: connection.host };
  // Prepare empty request body as per ICommunityPlatformModerationLog.IRequest (empty object)
  const requestBody: ICommunityPlatformModerationLog.IRequest = {};
  // Try to access moderation logs without authentication (anonymous)
  await TestValidator.httpError(
    "unauthorized access without token",
    401,
    async () => {
      await api.functional.communityPlatform.moderator.moderation_logs.patch(
        anonymousConnection,
        {
          body: requestBody,
        },
      );
    },
  );
  // Authenticate as moderator by joining
  const moderatorConnection = { host: connection.host };
  const authInfo = await authorize_moderator_join(moderatorConnection, {
    body: {},
  });
  // Use the authorized connection (headers are set internally by authorize function)
  const authorizedConnection: api.IConnection = {
    host: connection.host,
    headers: { Authorization: authInfo.token.access },
  };
  // Access moderation logs after authentication
  const result =
    await api.functional.communityPlatform.moderator.moderation_logs.patch(
      authorizedConnection,
      { body: requestBody },
    );
  typia.assert(result);
  // Validate that result has pagination and data arrays as per schema
  TestValidator.predicate(
    "pagination field exists",
    result.pagination !== undefined && result.pagination !== null,
  );
  TestValidator.predicate("data field exists", Array.isArray(result.data));
}
