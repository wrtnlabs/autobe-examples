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

export async function test_api_posts_community_posts_listing_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. User joins and is authorized
  const userConnection: api.IConnection = { host: connection.host };
  const authUser = await authorize_user_join(userConnection, {});
  typia.assert(authUser);
  userConnection.headers = { Authorization: authUser.token.access };
  // 2. User creates a new community
  const community =
    await generate_random_community_platform_user_communities_create(
      userConnection,
      {},
    );
  typia.assert(community);
  // 3. Prepare request body with default filters and pagination (empty)
  const body: ICommunityPlatformPost.IRequest = {};
  // 4. Request the posts list for the created community
  const response =
    await api.functional.communityPlatform.user.communities.posts.index(
      userConnection,
      {
        communityId: community.id,
        body,
      },
    );
  typia.assert(response);
  // 5. Validate pagination metadata
  TestValidator.predicate(
    "pagination current page number is at least 1",
    response.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination limit is at least 1",
    response.pagination.limit >= 1,
  );
  TestValidator.predicate(
    "pagination records equals or greater than data length",
    response.pagination.records >= response.data.length,
  );
  TestValidator.predicate(
    "pagination pages are correct",
    response.pagination.pages ===
      (response.pagination.records === 0
        ? 0
        : Math.ceil(response.pagination.records / response.pagination.limit)),
  );
  // 6. Validate each post in data array
  for (const post of response.data) {
    // 6.1. Validate post structure
    typia.assert(post);
    // 6.2. Validate that community id matches the requested community
    TestValidator.equals("post community id", post.community.id, community.id);
    // 6.3. Either authorUser or authorModerator is present (but not both null)
    TestValidator.predicate(
      "post has authorUser or authorModerator",
      post.authorUser !== null || post.authorModerator !== null,
    );
    // 6.4. Validate voteScore is integer
    TestValidator.predicate(
      "post voteScore is integer",
      Number.isInteger(post.voteScore),
    );
    // 6.5. Validate commentCount is integer and non-negative
    TestValidator.predicate(
      "post commentCount is non-negative integer",
      Number.isInteger(post.commentCount) && post.commentCount >= 0,
    );
  }
}
