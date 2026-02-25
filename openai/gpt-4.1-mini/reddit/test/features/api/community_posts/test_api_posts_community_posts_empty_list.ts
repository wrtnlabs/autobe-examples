import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformPost";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";
import { generate_random_community_platform_user_communities_create } from "../../../generate/generate_random_community_platform_user_communities_create";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";

export async function test_api_posts_community_posts_empty_list(
  connection: api.IConnection,
): Promise<void> {
  // 1. User join and authenticate
  const userConnection: api.IConnection = { host: connection.host };
  const userAuthorized = await authorize_user_join(userConnection, {});
  userConnection.headers = {
    Authorization: `Bearer ${userAuthorized.token.access}`,
  };
  // 2. Create a community
  const community =
    await generate_random_community_platform_user_communities_create(
      userConnection,
      {},
    );
  // 3. Query posts for the community when no posts exist
  const postList =
    await api.functional.communityPlatform.user.communities.posts.index(
      userConnection,
      {
        communityId: community.id,
        body: {
          postType: null,
          sortingMode: null,
          timeRange: null,
          page: 1,
          limit: 10,
        } satisfies ICommunityPlatformPost.IRequest,
      },
    );
  typia.assert(postList);
  // 4. Validate response data is empty
  TestValidator.equals("post list data is empty", postList.data.length, 0);
  // 5. Validate pagination metadata indicates zero records
  TestValidator.equals(
    "pagination records is zero",
    postList.pagination.records,
    0,
  );
  // 6. Validate pagination pages is zero
  TestValidator.equals(
    "pagination pages is zero",
    postList.pagination.pages,
    0,
  );
  // 7. Validate pagination current and limit values
  TestValidator.equals(
    "pagination current page",
    postList.pagination.current,
    1,
  );
  TestValidator.equals("pagination limit", postList.pagination.limit, 10);
}
