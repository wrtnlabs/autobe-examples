import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityPost";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import type { IRedditCommunityUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUserProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_user_profile_posts_filtering(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create viewer (authenticated member to view posts)
  const viewerConnection: api.IConnection = { host: connection.host };
  const viewerAuth = await api.functional.redditCommunity.auth.member.join(
    viewerConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      },
    },
  );
  typia.assert(viewerAuth);
  // 2. Create target user (whose posts will be viewed)
  const targetConnection: api.IConnection = { host: connection.host };
  const targetAuth = await api.functional.redditCommunity.auth.member.join(
    targetConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      },
    },
  );
  typia.assert(targetAuth);
  // Extract target user ID
  const targetUserId = typia.random<string & tags.Format<"uuid">>();
  // 3. Test 1: Get all posts without filters
  const allPostsResponse =
    await api.functional.redditCommunity.member.users.posts.index(
      viewerConnection,
      {
        userId: targetUserId,
        body: {},
      },
    );
  typia.assert(allPostsResponse);
  TestValidator.equals(
    "all posts pagination current",
    allPostsResponse.pagination.current,
    1,
  );
  TestValidator.equals(
    "all posts pagination limit",
    allPostsResponse.pagination.limit,
    20,
  );
  TestValidator.equals(
    "all posts pagination pages",
    allPostsResponse.pagination.pages,
    Math.ceil(
      allPostsResponse.pagination.records / allPostsResponse.pagination.limit,
    ),
  );
  // 4. Test 2: Test community filtering
  const targetCommunityId = typia.random<string & tags.Format<"uuid">>();
  const communityFilteredResponse =
    await api.functional.redditCommunity.member.users.posts.index(
      viewerConnection,
      {
        userId: targetUserId,
        body: {
          community_id: targetCommunityId,
        },
      },
    );
  typia.assert(communityFilteredResponse);
  TestValidator.equals(
    "community filtered pagination current",
    communityFilteredResponse.pagination.current,
    1,
  );
  // All returned posts should be from the specified community
  if (communityFilteredResponse.data.length > 0) {
    TestValidator.equals(
      "community filter applies correctly",
      communityFilteredResponse.data[0].community.id,
      targetCommunityId,
    );
  }
  // 5. Test 3: Test keyword search filtering
  const searchKeyword = RandomGenerator.name(2);
  const searchFilteredResponse =
    await api.functional.redditCommunity.member.users.posts.index(
      viewerConnection,
      {
        userId: targetUserId,
        body: {
          search: searchKeyword,
        },
      },
    );
  typia.assert(searchFilteredResponse);
  TestValidator.equals(
    "search filtered pagination current",
    searchFilteredResponse.pagination.current,
    1,
  );
  // All returned posts should contain the search keyword in title
  if (searchFilteredResponse.data.length > 0) {
    TestValidator.predicate("search returns posts matching keyword", () =>
      searchFilteredResponse.data.every((post) =>
        post.title.toLowerCase().includes(searchKeyword.toLowerCase()),
      ),
    );
  }
  // 6. Test 4: Test combined filters (community_id AND search)
  const combinedResponse =
    await api.functional.redditCommunity.member.users.posts.index(
      viewerConnection,
      {
        userId: targetUserId,
        body: {
          community_id: targetCommunityId,
          search: searchKeyword,
        },
      },
    );
  typia.assert(combinedResponse);
  TestValidator.equals(
    "combined filter pagination current",
    combinedResponse.pagination.current,
    1,
  );
  // Combined results should be subset of both individual filters
  TestValidator.predicate(
    "combined filter returns fewer or equal results",
    () =>
      combinedResponse.data.length <=
      Math.min(
        communityFilteredResponse.data.length,
        searchFilteredResponse.data.length,
      ),
  );
  // 7. Test 5: Test pagination with different page and limit
  const paginationResponse =
    await api.functional.redditCommunity.member.users.posts.index(
      viewerConnection,
      {
        userId: targetUserId,
        body: {
          page: 2,
          limit: 10,
        },
      },
    );
  typia.assert(paginationResponse);
  TestValidator.equals(
    "page 2 pagination current",
    paginationResponse.pagination.current,
    2,
  );
  TestValidator.equals(
    "page 2 pagination limit",
    paginationResponse.pagination.limit,
    10,
  );
  TestValidator.equals(
    "page 2 pagination pages",
    paginationResponse.pagination.pages,
    Math.ceil(
      paginationResponse.pagination.records /
        paginationResponse.pagination.limit,
    ),
  );
  // 8. Test 6: Verify reverse chronological ordering
  if (allPostsResponse.data.length > 1) {
    TestValidator.predicate("posts are in reverse chronological order", () => {
      for (let i = 0; i < allPostsResponse.data.length - 1; i++) {
        const current = new Date(allPostsResponse.data[i].created_at).getTime();
        const next = new Date(
          allPostsResponse.data[i + 1].created_at,
        ).getTime();
        if (current < next) return false;
      }
      return true;
    });
  }
  // 9. Test 7: Verify pagination metadata accuracy
  TestValidator.equals(
    "pagination records matches actual data count",
    paginationResponse.pagination.records,
    paginationResponse.data.length,
  );
  TestValidator.equals(
    "pagination pages is calculated correctly",
    paginationResponse.pagination.pages,
    paginationResponse.pagination.records > 0
      ? Math.ceil(
          paginationResponse.pagination.records /
            paginationResponse.pagination.limit,
        )
      : 0,
  );
}