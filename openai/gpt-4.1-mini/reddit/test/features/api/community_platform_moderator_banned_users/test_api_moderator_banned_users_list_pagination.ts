import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformBannedUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformBannedUser";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformBannedUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformBannedUser";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_moderator_join } from "../../../authorize/authorize_moderator_join";
import { authorize_moderator_login } from "../../../authorize/authorize_moderator_login";
import { authorize_moderator_refresh } from "../../../authorize/authorize_moderator_refresh";

export async function test_api_moderator_banned_users_list_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Moderator joins to obtain authorized connection
  const moderatorConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_moderator_join(moderatorConnection, {
    body: {},
  });
  moderatorConnection.headers = {
    ...moderatorConnection.headers,
    Authorization: authorized.token.access,
  };
  // 2. Call API with empty filter to test defaults pagination
  const response =
    await api.functional.communityPlatform.moderator.bannedUsers.index(
      moderatorConnection,
      {
        body: {}, // empty filter object
      },
    );
  // 3. Validate response structure
  typia.assert(response);
  // 4. Validate pagination metadata
  TestValidator.predicate(
    "pagination current page >= 1",
    response.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination limit > 0",
    response.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination records >= 0",
    response.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages >= 0",
    response.pagination.pages >= 0,
  );
  // 5. Validate data array
  TestValidator.predicate("data is array", Array.isArray(response.data));
  // 6. Check each banned user summary for correct structure
  TestValidator.predicate("data array not empty", response.data.length > 0);
  for (const bannedUser of response.data) {
    typia.assert(bannedUser);
    TestValidator.predicate(
      "bannedUser is object",
      typeof bannedUser === "object" && bannedUser !== null,
    );
    // Since unbanned_at property isn't defined in ISummary schema, skip property specific checks
    // If present, it could be null or ISO 8601 string, but we can't assert it without schema
  }
  // 7. Unauthorized access test
  const unauthorizedConnection: api.IConnection = { host: connection.host };
  await TestValidator.error(
    "unauthorized access to banned users list",
    async () => {
      await api.functional.communityPlatform.moderator.bannedUsers.index(
        unauthorizedConnection,
        {
          body: {},
        },
      );
    },
  );
}
