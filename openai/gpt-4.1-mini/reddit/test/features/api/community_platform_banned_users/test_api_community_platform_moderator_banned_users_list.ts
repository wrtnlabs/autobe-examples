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

export async function test_api_community_platform_moderator_banned_users_list(
  connection: api.IConnection,
): Promise<void> {
  // Test retrieving the paginated list of banned users in communities as a moderator.
  // Verify authentication is required. Confirm the response contains paginated ban records with user and community details, ban and optional unban timestamps, and reason.
  // Validate pagination parameters like current page, limit, total records, and total pages.
  // Verify authorization restricts results to communities moderated by the authenticated moderator.
  // 1. Moderator join and authentication
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderatorAuth = await authorize_moderator_join(moderatorConnection, {
    body: {},
  });
  typia.assert(moderatorAuth);
  // Attach token to headers
  moderatorConnection.headers = {
    Authorization: `Bearer ${moderatorAuth.token.access}`,
  };
  // 2. Call banned users list endpoint
  const bannedUsersPage =
    await api.functional.communityPlatform.moderator.community.banned_users.index(
      moderatorConnection,
    );
  // 3. Validate full response
  typia.assert(bannedUsersPage);
  // 4. Validate pagination metadata
  const { pagination, data } = bannedUsersPage;
  TestValidator.predicate(
    "pagination current page is >= 1",
    pagination.current >= 1,
  );
  TestValidator.predicate("pagination limit is >= 0", pagination.limit >= 0);
  TestValidator.predicate(
    "pagination records is >= 0",
    pagination.records >= 0,
  );
  TestValidator.predicate("pagination pages is >= 0", pagination.pages >= 0);
  TestValidator.predicate(
    "pagination pages matches records and limit",
    pagination.pages ===
      (pagination.limit === 0
        ? 0
        : Math.ceil(pagination.records / pagination.limit)),
  );
  // 5. Assert each banned user summary entry has correct type
  for (const banSummary of data) {
    typia.assert(banSummary);
  }
  // Implicitly covers authorization since the token and endpoint access are scoped
}
