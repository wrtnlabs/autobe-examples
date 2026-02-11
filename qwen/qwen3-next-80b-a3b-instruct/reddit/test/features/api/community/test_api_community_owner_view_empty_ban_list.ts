import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunityBanOfMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityBanOfMember";
import type { IRedditCommunityBanOfMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityBanOfMember";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityModerator";
import type { IRedditCommunityCommunityOwner } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityOwner";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_community_owner_join } from "../../../authorize/authorize_community_owner_join";
import { authorize_community_owner_login } from "../../../authorize/authorize_community_owner_login";
import { authorize_community_owner_refresh } from "../../../authorize/authorize_community_owner_refresh";

export async function test_api_community_owner_view_empty_ban_list(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create and authenticate as community owner
  const ownerConnection: api.IConnection = { host: connection.host };
  const ownerEmail = typia.random<string & tags.Format<"email">>();
  const ownerPassword = RandomGenerator.alphaNumeric(16);
  await authorize_community_owner_join(ownerConnection, {
    body: {
      email: ownerEmail,
      password: ownerPassword,
      display_name: RandomGenerator.name(),
    } satisfies IRedditCommunityCommunityOwner.IJoin,
  });
  // Step 2: Login to obtain authentication token
  const loginResult = await authorize_community_owner_login(ownerConnection, {
    body: {
      email: ownerEmail,
      password: ownerPassword,
    } satisfies IRedditCommunityCommunityOwner.ILogin,
  });
  ownerConnection.headers = {
    Authorization: `Bearer ${loginResult.token.access}`,
  };
  // Step 3: Generate a valid UUID for a community (does not need to exist in DB)
  const communityId = typia.random<string & tags.Format<"uuid">>();
  // Step 4: Request ban list for non-existent community - should return empty paginated list
  const banListResponse =
    await api.functional.redditCommunity.communityOwner.communities.bans.index(
      ownerConnection,
      {
        communityId,
        body: {},
      },
    );
  typia.assert(banListResponse);
  // Step 5: Validate response structure and content
  TestValidator.equals(
    "pagination current page",
    banListResponse.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit",
    banListResponse.pagination.limit,
    10,
  );
  TestValidator.equals(
    "pagination records",
    banListResponse.pagination.records,
    0,
  );
  TestValidator.equals("pagination pages", banListResponse.pagination.pages, 0);
  TestValidator.equals("bans data length", banListResponse.data.length, 0);
  TestValidator.predicate(
    "bans data is array",
    Array.isArray(banListResponse.data),
  );
  TestValidator.predicate(
    "bans data is empty array",
    banListResponse.data.length === 0,
  );
}
