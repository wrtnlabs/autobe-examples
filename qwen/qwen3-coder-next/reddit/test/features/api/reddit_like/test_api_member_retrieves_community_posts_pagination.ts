import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditLikePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditLikePost";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import type { IRedditLikePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePost";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_like_member_communities_create } from "../../../generate/generate_random_reddit_like_member_communities_create";
import { generate_random_reddit_like_member_posts_create } from "../../../generate/generate_random_reddit_like_member_posts_create";
import { prepare_random_reddit_like_community } from "../../../prepare/prepare_random_reddit_like_community";
import { prepare_random_reddit_like_post } from "../../../prepare/prepare_random_reddit_like_post";

export async function test_api_member_retrieves_community_posts_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member actor
  const memberConnection: api.IConnection = { host: connection.host };
  const memberInfo = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      displayName: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
    } satisfies IRedditLikeMember.IJoin,
  });
  typia.assert(memberInfo);
  // 2. Create community for testing
  const communityConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(communityConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      displayName: RandomGenerator.name(),
    } satisfies IRedditLikeMember.IJoin,
  });
  const community = await generate_random_reddit_like_member_communities_create(
    communityConnection,
    {
      body: {
        name: "test_pagination_community",
      } satisfies IRedditLikeCommunity.ICreate,
    },
  );
  typia.assert(community);
  // 3. Create 200 posts in the community for pagination testing
  const postCreates = ArrayUtil.asyncRepeat(200, async (i) => {
    return await generate_random_reddit_like_member_posts_create(
      communityConnection,
      {
        body: {
          title: `Post ${i + 1} - ${RandomGenerator.name(3)}`,
          type: "text" as const,
          content: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IRedditLikePost.ICreate,
      },
    );
  });
  const posts = await postCreates;
  typia.assert(posts);
  // 4. Test pagination with different page/limit combinations
  // Test 1: First page with default limit (100)
  const page1 = await api.functional.redditLike.member.communities.posts.index(
    memberConnection,
    {
      communityName: community.name,
      body: {
        title: "Test post",
        type: "text" as const,
        communityName: community.name,
      } satisfies IRedditLikePost.IRequest,
    },
  );
  typia.assert(page1);
  TestValidator.equals("page 1 count", page1.data.length, 100);
  TestValidator.equals(
    "page 1 pagination current",
    page1.pagination.current,
    1,
  );
  TestValidator.equals("page 1 pagination limit", page1.pagination.limit, 100);
  TestValidator.equals(
    "page 1 pagination records",
    page1.pagination.records,
    200,
  );
  TestValidator.equals("page 1 pagination pages", page1.pagination.pages, 2);
  // Test 2: Second page with default limit
  const page2 = await api.functional.redditLike.member.communities.posts.index(
    memberConnection,
    {
      communityName: community.name,
      body: {
        title: "Test post",
        type: "text" as const,
        communityName: community.name,
        page: 2,
        limit: 100,
      } satisfies IRedditLikePost.IRequest,
    },
  );
  typia.assert(page2);
  TestValidator.equals("page 2 count", page2.data.length, 100);
  TestValidator.equals(
    "page 2 pagination current",
    page2.pagination.current,
    2,
  );
  TestValidator.equals(
    "page 2 pagination records",
    page2.pagination.records,
    200,
  );
  TestValidator.equals("page 2 pagination pages", page2.pagination.pages, 2);
  // Test 3: Verify no overlap between pages
  const page1Ids = new Set(page1.data.map((p) => p.id));
  const page2Ids = new Set(page2.data.map((p) => p.id));
  const overlap = [...page1Ids].filter((id) => page2Ids.has(id));
  TestValidator.equals("no page overlap", overlap.length, 0);
  // Test 4: Request page beyond range (page 3 with limit 100)
  const page3 = await api.functional.redditLike.member.communities.posts.index(
    memberConnection,
    {
      communityName: community.name,
      body: {
        title: "Test post",
        type: "text" as const,
        communityName: community.name,
        page: 3,
        limit: 100,
      } satisfies IRedditLikePost.IRequest,
    },
  );
  typia.assert(page3);
  TestValidator.equals(
    "page 3 beyond range - empty data",
    page3.data.length,
    0,
  );
  TestValidator.equals(
    "page 3 pagination current",
    page3.pagination.current,
    3,
  );
  TestValidator.equals(
    "page 3 pagination records",
    page3.pagination.records,
    200,
  );
  TestValidator.equals("page 3 pagination pages", page3.pagination.pages, 2);
  // Test 5: Custom limit (20 posts per page)
  const smallPage1 =
    await api.functional.redditLike.member.communities.posts.index(
      memberConnection,
      {
        communityName: community.name,
        body: {
          title: "Test post",
          type: "text" as const,
          communityName: community.name,
          limit: 20,
        } satisfies IRedditLikePost.IRequest,
      },
    );
  typia.assert(smallPage1);
  TestValidator.equals("custom limit count", smallPage1.data.length, 20);
  TestValidator.equals(
    "custom limit pagination current",
    smallPage1.pagination.current,
    1,
  );
  TestValidator.equals(
    "custom limit pagination limit",
    smallPage1.pagination.limit,
    20,
  );
  TestValidator.equals(
    "custom limit pagination records",
    smallPage1.pagination.records,
    200,
  );
  TestValidator.equals(
    "custom limit pagination pages",
    smallPage1.pagination.pages,
    10,
  );
  // Test 6: Last page with custom limit
  const lastPage =
    await api.functional.redditLike.member.communities.posts.index(
      memberConnection,
      {
        communityName: community.name,
        body: {
          title: "Test post",
          type: "text" as const,
          communityName: community.name,
          page: 10,
          limit: 20,
        } satisfies IRedditLikePost.IRequest,
      },
    );
  typia.assert(lastPage);
  TestValidator.equals("last page count", lastPage.data.length, 20);
  TestValidator.equals(
    "last page pagination current",
    lastPage.pagination.current,
    10,
  );
  TestValidator.equals(
    "last page pagination records",
    lastPage.pagination.records,
    200,
  );
  TestValidator.equals(
    "last page pagination pages",
    lastPage.pagination.pages,
    10,
  );
  // Test 7: Very small limit to test page boundary
  const tinyPage1 =
    await api.functional.redditLike.member.communities.posts.index(
      memberConnection,
      {
        communityName: community.name,
        body: {
          title: "Test post",
          type: "text" as const,
          communityName: community.name,
          limit: 10,
        } satisfies IRedditLikePost.IRequest,
      },
    );
  typia.assert(tinyPage1);
  TestValidator.equals("tiny limit count", tinyPage1.data.length, 10);
  TestValidator.equals(
    "tiny limit pagination pages",
    tinyPage1.pagination.pages,
    20,
  );
  // Test 8: Verify pagination metadata accuracy across different scenarios
  const scenarios = [
    { page: 1, limit: 50, expectedPages: 4, expectedRecords: 200 },
    { page: 4, limit: 50, expectedPages: 4, expectedRecords: 200 },
    { page: 1, limit: 200, expectedPages: 1, expectedRecords: 200 },
    { page: 1, limit: 1, expectedPages: 200, expectedRecords: 200 },
  ];
  for (const scenario of scenarios) {
    const result =
      await api.functional.redditLike.member.communities.posts.index(
        memberConnection,
        {
          communityName: community.name,
          body: {
            title: "Test post",
            type: "text" as const,
            communityName: community.name,
            page: scenario.page,
            limit: scenario.limit,
          } satisfies IRedditLikePost.IRequest,
        },
      );
    typia.assert(result);
    TestValidator.equals(
      `scenario page=${scenario.page}, limit=${scenario.limit} pagination current`,
      result.pagination.current,
      scenario.page,
    );
    TestValidator.equals(
      `scenario page=${scenario.page}, limit=${scenario.limit} pagination limit`,
      result.pagination.limit,
      scenario.limit,
    );
    TestValidator.equals(
      `scenario page=${scenario.page}, limit=${scenario.limit} pagination records`,
      result.pagination.records,
      scenario.expectedRecords,
    );
    TestValidator.equals(
      `scenario page=${scenario.page}, limit=${scenario.limit} pagination pages`,
      result.pagination.pages,
      scenario.expectedPages,
    );
  }
}
