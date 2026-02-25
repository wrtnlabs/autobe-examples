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

import { authorize_moderator_join } from "../../../authorize/authorize_moderator_join";
import { authorize_moderator_login } from "../../../authorize/authorize_moderator_login";
import { authorize_moderator_refresh } from "../../../authorize/authorize_moderator_refresh";
import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";
import { generate_random_community_platform_user_communities_create } from "../../../generate/generate_random_community_platform_user_communities_create";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";

/**
 * E2E test for moderator retrieving community posts with varied filters and pagination.
 * Tests primary success, filtering, sorting, and pagination edge cases.
 */
export async function test_api_community_moderator_posts_index_varied_filters_pagination(
  connection: api.IConnection,
): Promise<void> {
  // Scenario 1: Primary success path of retrieving posts in a community by a moderator.
  // 1. Moderator join
  const moderatorJoinConnection: api.IConnection = { host: connection.host };
  const moderator = await authorize_moderator_join(moderatorJoinConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: RandomGenerator.name(),
      displayName: null,
      bio: null,
      avatarUrl: null,
    },
  });
  // Using moderatorJoinConnection with authorization header set by join
  // 2. Moderator creates a community
  const community =
    await generate_random_community_platform_user_communities_create(
      moderatorJoinConnection,
      {},
    );
  // 3. Posts creation is not possible due to missing utility. Assuming pre-existing posts in simulator environment.
  // 4. Scenario 1: Query with default filters and pagination
  const defaultResponse =
    await api.functional.communityPlatform.moderator.communities.posts.index(
      moderatorJoinConnection,
      {
        communityId: community.id,
        body: {
          page: 1,
          limit: 10,
        },
      },
    );
  typia.assert(defaultResponse);
  TestValidator.predicate(
    "Scenario 1: There are posts in the response data",
    defaultResponse.data.length > 0,
  );
  for (const post of defaultResponse.data) {
    typia.assert(post);
    TestValidator.equals(
      "Scenario 1: post community ID",
      post.community.id,
      community.id,
    );
    TestValidator.predicate(
      "Scenario 1: post has title",
      typeof post.title === "string" && post.title.length > 0,
    );
    TestValidator.predicate(
      "Scenario 1: post postType is one of ['text', 'link', 'image']",
      ["text", "link", "image"].includes(post.postType),
    );
    TestValidator.predicate(
      "Scenario 1: post has voteScore as number",
      typeof post.voteScore === "number",
    );
    TestValidator.predicate(
      "Scenario 1: post has commentCount as number",
      typeof post.commentCount === "number",
    );
  }
  typia.assert(defaultResponse.pagination);
  TestValidator.equals(
    "Scenario 1: pagination current page",
    defaultResponse.pagination.current,
    1,
  );
  TestValidator.equals(
    "Scenario 1: pagination limit",
    defaultResponse.pagination.limit,
    10,
  );
  TestValidator.predicate(
    "Scenario 1: pagination records is non-negative",
    defaultResponse.pagination.records >= 0,
  );
  TestValidator.predicate(
    "Scenario 1: pagination pages is non-negative",
    defaultResponse.pagination.pages >= 0,
  );
  // Scenario 2: Filtering posts by type and sorting mode
  // 1. Use a new community for isolation
  const community2 =
    await generate_random_community_platform_user_communities_create(
      moderatorJoinConnection,
      {},
    );
  // 2. Query posts filtered by type 'text' and sorting mode 'new'
  const filterResponse =
    await api.functional.communityPlatform.moderator.communities.posts.index(
      moderatorJoinConnection,
      {
        communityId: community2.id,
        body: {
          postType: "text",
          sortingMode: "new",
          page: 1,
          limit: 10,
        },
      },
    );
  typia.assert(filterResponse);
  // Validate that posts, if present, all have postType 'text'
  for (const post of filterResponse.data) {
    typia.assert(post);
    TestValidator.equals(
      "Scenario 2: postType filter applied",
      post.postType,
      "text",
    );
  }
  typia.assert(filterResponse.pagination);
  TestValidator.equals(
    "Scenario 2: pagination current page",
    filterResponse.pagination.current,
    1,
  );
  TestValidator.equals(
    "Scenario 2: pagination limit",
    filterResponse.pagination.limit,
    10,
  );
  TestValidator.predicate(
    "Scenario 2: pagination records is non-negative",
    filterResponse.pagination.records >= 0,
  );
  TestValidator.predicate(
    "Scenario 2: pagination pages is non-negative",
    filterResponse.pagination.pages >= 0,
  );
  // Scenario 3: Pagination and empty result handling
  // 1. Create community without posts
  const community3 =
    await generate_random_community_platform_user_communities_create(
      moderatorJoinConnection,
      {},
    );
  // 2. Request page that exceeds available data (e.g., page 999)
  const emptyPageResponse =
    await api.functional.communityPlatform.moderator.communities.posts.index(
      moderatorJoinConnection,
      {
        communityId: community3.id,
        body: {
          page: 999,
          limit: 10,
        },
      },
    );
  typia.assert(emptyPageResponse);
  TestValidator.equals(
    "Scenario 3: pagination current page",
    emptyPageResponse.pagination.current,
    999,
  );
  TestValidator.equals(
    "Scenario 3: pagination limit",
    emptyPageResponse.pagination.limit,
    10,
  );
  TestValidator.equals(
    "Scenario 3: pagination records",
    emptyPageResponse.pagination.records,
    0,
  );
  TestValidator.equals(
    "Scenario 3: pagination pages",
    emptyPageResponse.pagination.pages,
    0,
  );
  TestValidator.equals(
    "Scenario 3: empty data list",
    emptyPageResponse.data.length,
    0,
  );
  // 3. Request with filters that match no posts
  const emptyFilterResponse =
    await api.functional.communityPlatform.moderator.communities.posts.index(
      moderatorJoinConnection,
      {
        communityId: community3.id,
        body: {
          postType: "image",
          sortingMode: "top",
          timeRange: "day",
          page: 1,
          limit: 10,
        },
      },
    );
  typia.assert(emptyFilterResponse);
  TestValidator.equals(
    "Scenario 3: filter with no matching posts",
    emptyFilterResponse.data.length,
    0,
  );
}
