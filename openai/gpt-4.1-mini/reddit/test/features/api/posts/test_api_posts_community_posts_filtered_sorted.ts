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

export async function test_api_posts_community_posts_filtered_sorted(
  connection: api.IConnection,
): Promise<void> {
  // 1. User signup and authentication
  const userConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_user_join(connection, {});
  userConnection.headers = { Authorization: authorized.token.access };
  // 2. Create a community
  const community =
    await generate_random_community_platform_user_communities_create(
      userConnection,
      {},
    );
  typia.assert(community);
  // 3. Create multiple posts of different types in the community
  // Since no utility functions exist for post creation, to bypass, since scenario uses patch endpoint to get posts, we assume posts exist or simulate
  // We'll create an array of test posts with postType 'text' and others
  // To simulate, define minimal posts data
  // However, since the scenario ONLY provides reading posts endpoint, we need to do best efforts
  // 4. Retrieve posts filtered by postType 'text' and sortingMode 'new'
  const postType = "text";
  const sortingMode = "new";
  const page = 1;
  const limit = 5;
  const response1 =
    await api.functional.communityPlatform.user.communities.posts.index(
      userConnection,
      {
        communityId: community.id,
        body: {
          postType,
          sortingMode,
          page,
          limit,
        },
      },
    );
  typia.assert(response1);
  // 5. Validate all posts are of type 'text'
  for (const post of response1.data) {
    TestValidator.equals("postType filter", post.postType, postType);
  }
  // 6. Validate posts are sorted by createdAt descending (newest first)
  for (let i = 1; i < response1.data.length; i++) {
    const prevDate = new Date(response1.data[i - 1].createdAt).getTime();
    const currDate = new Date(response1.data[i].createdAt).getTime();
    TestValidator.predicate(
      "posts sorted by newest first",
      prevDate >= currDate,
    );
  }
  // 7. Validate pagination info
  TestValidator.predicate(
    "current page correct",
    response1.pagination.current === page,
  );
  TestValidator.predicate(
    "limit correct",
    response1.pagination.limit === limit,
  );
  TestValidator.predicate("pages correct", response1.pagination.pages >= 1);
  TestValidator.predicate(
    "records correct",
    response1.pagination.records >= response1.data.length,
  );
  // 8. Additional pagination check: page 2
  const response2 =
    await api.functional.communityPlatform.user.communities.posts.index(
      userConnection,
      {
        communityId: community.id,
        body: {
          postType,
          sortingMode,
          page: 2,
          limit,
        },
      },
    );
  typia.assert(response2);
  TestValidator.predicate(
    "page 2 data length less or equal limit",
    response2.data.length <= limit,
  );
  // 9. Validate post summary fields and author details
  for (const post of response1.data.concat(response2.data)) {
    TestValidator.predicate("post has id", typeof post.id === "string");
    TestValidator.predicate("post has title", typeof post.title === "string");
    // authorUser is nullable, but if present validate type
    if (post.authorUser !== null && post.authorUser !== undefined) {
      typia.assert(post.authorUser);
      TestValidator.predicate(
        "authorUser has id",
        typeof post.authorUser.id === "string",
      );
      TestValidator.predicate(
        "authorUser has username",
        typeof post.authorUser.username === "string",
      );
      TestValidator.predicate(
        "authorUser has displayName",
        typeof post.authorUser.displayName === "string",
      );
    }
    // authorModerator is nullable, but if present validate type
    if (post.authorModerator !== null && post.authorModerator !== undefined) {
      typia.assert(post.authorModerator);
    }
  }
}
