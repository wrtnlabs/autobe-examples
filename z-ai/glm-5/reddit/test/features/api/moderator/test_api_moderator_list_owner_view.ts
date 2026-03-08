import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityModerator";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformCommunityModerator";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_community_platform_member_communities_create } from "../../../generate/generate_random_community_platform_member_communities_create";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";

export async function test_api_moderator_list_owner_view(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member and authenticate (becomes community owner)
  const ownerConnection: api.IConnection = { host: connection.host };
  const ownerAuth = await authorize_member_join(ownerConnection, {});
  typia.assert(ownerAuth);
  // 2. Create a community (owner is automatically granted full moderation authority)
  const community =
    await generate_random_community_platform_member_communities_create(
      ownerConnection,
      {},
    );
  typia.assert(community);
  // 3. Retrieve moderator list as community owner
  const moderatorList =
    await api.functional.communityPlatform.communities.moderators.index(
      ownerConnection,
      {
        communityName: community.name,
        body: {} satisfies ICommunityPlatformCommunityModerator.IRequest,
      },
    );
  typia.assert(moderatorList);
  // 4. Validate pagination metadata structure and defaults
  TestValidator.equals(
    "default page is 1",
    moderatorList.pagination.current,
    1,
  );
  TestValidator.equals(
    "default limit is 20",
    moderatorList.pagination.limit,
    20,
  );
  TestValidator.predicate(
    "records count is non-negative",
    moderatorList.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages count is non-negative",
    moderatorList.pagination.pages >= 0,
  );
  // 5. Validate data length constraints
  TestValidator.predicate(
    "data length within limit",
    moderatorList.data.length <= moderatorList.pagination.limit,
  );
  TestValidator.predicate(
    "data length within total records",
    moderatorList.data.length <= moderatorList.pagination.records,
  );
  // 6. Validate total pages calculation
  const expectedPages = Math.ceil(
    moderatorList.pagination.records / moderatorList.pagination.limit,
  );
  TestValidator.equals(
    "total pages calculated correctly",
    moderatorList.pagination.pages,
    expectedPages,
  );
}
