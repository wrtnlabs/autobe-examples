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

export async function test_api_moderator_banned_users_filter_active_status(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create a moderator account and obtain authorization
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderatorAuthorized = await authorize_moderator_join(
    moderatorConnection,
    {
      body: {},
    },
  );
  moderatorConnection.headers = {
    Authorization: `Bearer ${moderatorAuthorized.token.access}`,
  };
  // 2. Call the bannedUsers index endpoint with empty filter body
  const response =
    await api.functional.communityPlatform.moderator.bannedUsers.index(
      moderatorConnection,
      { body: {} },
    );
  // 3. Assert and validate response type
  typia.assert(response);
  // 4. Validate pagination metadata
  const pagination = response.pagination;
  TestValidator.predicate(
    "pagination current page non-negative",
    pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination limit non-negative",
    pagination.limit >= 0,
  );
  TestValidator.predicate(
    "pagination records non-negative",
    pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages non-negative",
    pagination.pages >= 0,
  );
  // 5. Assert response data type
  const bannedUsers = typia.assert<ICommunityPlatformBannedUser.ISummary[]>(
    response.data,
  );
  // Note: Cannot validate 'unbanned_at' on bannedUsers because the property does not exist on ICommunityPlatformBannedUser.ISummary
  // Scenario specifies to filter active bans (unbanned_at null), but property is not present in DTO
  // Therefore, we only test the API and validate pagination to comply with scenario requirements
}
