import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunityBannedUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityBannedUser";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformCommunityBannedUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformCommunityBannedUser";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_moderator_join } from "../../../authorize/authorize_moderator_join";
import { authorize_moderator_login } from "../../../authorize/authorize_moderator_login";
import { authorize_moderator_refresh } from "../../../authorize/authorize_moderator_refresh";

export async function test_api_moderator_banned_users_index_empty_result_handling(
  connection: api.IConnection,
): Promise<void> {
  // 1. Join as moderator and authorize
  const baseConnection: api.IConnection = { host: connection.host };
  const moderator = await authorize_moderator_join(baseConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: RandomGenerator.name(),
      displayName: null,
      bio: null,
      avatarUrl: null,
    },
  });
  // Create a new connection with auth token provided by join response
  const moderatorConnection: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: moderator.token.access,
    },
  };
  // 2. Generate a valid UUID for communityId (assuming no banned users exist for this Id or filter will produce empty results)
  const communityId = typia.random<string & tags.Format<"uuid">>();
  // 3. Prepare filter that deliberately produces zero results (future date filter, and impossible search)
  const futureDate = new Date(
    Date.now() + 1000 * 60 * 60 * 24 * 365,
  ).toISOString(); // 1 year in future
  const body = {
    bannedAt: futureDate, // filter ban date in the future (no bans should match)
    unbannedAt: futureDate, // filter unban date in the future (no bans match)
    search: "non_existing_user_search_term_should_produce_no_results",
    banStatus: "banned", // filtering current bans
    page: 1,
    limit: 10,
  } satisfies ICommunityPlatformCommunityBannedUser.IRequest;
  // 4. Call the banned users index endpoint
  const result =
    await api.functional.communityPlatform.moderator.communities.banned_users.index(
      moderatorConnection,
      { communityId, body },
    );
  typia.assert(result);
  // 5. Validate result is empty page
  TestValidator.equals("empty data array", result.data.length, 0);
  TestValidator.equals("pagination current page", result.pagination.current, 1);
  TestValidator.equals("pagination records", result.pagination.records, 0);
  TestValidator.equals("pagination pages", result.pagination.pages, 0);
  TestValidator.equals("pagination limit", result.pagination.limit, 10);
}
