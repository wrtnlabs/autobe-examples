import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityPost";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityCommunityIcon } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityIcon";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import type { IRedditCommunityPostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPostImage";
import type { IRedditCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunitySubscription";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_community_member_communities_create } from "../../../generate/generate_random_reddit_community_member_communities_create";
import { prepare_random_reddit_community_community } from "../../../prepare/prepare_random_reddit_community_community";

/**
 * Test retrieving a paginated list of posts authored by a specific member.
 * 1. Create viewer member account
 * 2. Create target member account whose posts will be retrieved
 * 3. Login as target member
 * 4. Create community for target member
 * 5. Subscribe to community
 * 6. Create multiple posts (25 posts to test pagination)
 * 7. Retrieve posts with default pagination (page=1, limit=20)
 * 8. Validate pagination metadata and post structure
 * 9. Retrieve page 2 to verify pagination works
 * 10. Test with custom limit parameter
 */
export async function test_api_member_posts_retrieval_with_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate viewer member
  const viewerConnection: api.IConnection = { host: connection.host };
  const viewerAuth = await authorize_member_join(viewerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPassword123!",
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditCommunityMember.IJoin,
  });
  typia.assert(viewerAuth);
  // 2. Create target member account
  const targetEmail = typia.random<string & tags.Format<"email">>();
  const targetPassword = "TestPassword123!";
  const targetUsername = RandomGenerator.name(1);
  const targetAuth = await authorize_member_join(
    { host: connection.host },
    {
      body: {
        email: targetEmail,
        password: targetPassword,
        username: targetUsername,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      } satisfies IRedditCommunityMember.IJoin,
    },
  );
  typia.assert(targetAuth);
  const targetMemberId = targetAuth.id;
  // 3. Login target member to establish session
  const targetConnection: api.IConnection = { host: connection.host };
  await authorize_member_login(targetConnection, {
    body: {
      email: targetEmail,
      password: targetPassword,
    } satisfies IRedditCommunityMember.ILogin,
  });
  // 4. Create community for target member
  const community =
    await generate_random_reddit_community_member_communities_create(
      targetConnection,
      {},
    );
  typia.assert(community);
  // 5. Subscribe target member to the community
  const subscription =
    await api.functional.redditCommunity.member.communities.subscription.create(
      targetConnection,
      {
        communityName: community.name,
      },
    );
  typia.assert(subscription);
  // 6. Create multiple posts (25 posts to test pagination with default limit=20)
  const postCount = 25;
  const createdPosts: IRedditCommunityPost[] = [];
  for (let i = 0; i < postCount; i++) {
    const postType = RandomGenerator.pick(["text", "link", "image"] as const);
    const postBody: IRedditCommunityPost.ICreate = {
      title: `Test Post ${i + 1} - ${RandomGenerator.paragraph({ sentences: 1 })}`,
      post_type: postType,
      ...(postType === "text" && {
        text_content: RandomGenerator.content({ paragraphs: 2 }),
      }),
      ...(postType === "link" && {
        link_url: typia.random<string & tags.Format<"uri">>(),
      }),
      ...(postType === "image" && {
        image_path: `/images/test-${i}.jpg`,
      }),
    } satisfies IRedditCommunityPost.ICreate;
    const post = await api.functional.redditCommunity.member.posts.create(
      targetConnection,
      {
        body: postBody,
      },
    );
    typia.assert(post);
    createdPosts.push(post);
  }
  // 7. Retrieve posts with default pagination (page=1, limit=20)
  const page1Result =
    await api.functional.redditCommunity.member.members.posts.index(
      viewerConnection,
      {
        memberId: targetMemberId,
        body: {
          page: 1,
          limit: 20,
          sort: "new",
        } satisfies IRedditCommunityPost.IRequest,
      },
    );
  typia.assert(page1Result);
  // 8. Validate pagination metadata
  TestValidator.equals(
    "page 1 current page",
    page1Result.pagination.current,
    1,
  );
  TestValidator.equals("page 1 limit", page1Result.pagination.limit, 20);
  TestValidator.equals(
    "page 1 total records",
    page1Result.pagination.records,
    postCount,
  );
  TestValidator.equals("page 1 total pages", page1Result.pagination.pages, 2);
  // 9. Validate page 1 data structure
  TestValidator.predicate(
    "page 1 has 20 posts",
    page1Result.data.length === 20,
  );
  // 10. Validate all posts on page 1 are by target member
  for (const post of page1Result.data) {
    TestValidator.equals(
      "post author is target member",
      post.author.id,
      targetMemberId,
    );
  }
  // 11. Retrieve page 2 to verify pagination works correctly
  const page2Result =
    await api.functional.redditCommunity.member.members.posts.index(
      viewerConnection,
      {
        memberId: targetMemberId,
        body: {
          page: 2,
          limit: 20,
          sort: "new",
        } satisfies IRedditCommunityPost.IRequest,
      },
    );
  typia.assert(page2Result);
  // 12. Validate page 2 metadata
  TestValidator.equals(
    "page 2 current page",
    page2Result.pagination.current,
    2,
  );
  TestValidator.equals("page 2 limit", page2Result.pagination.limit, 20);
  TestValidator.equals(
    "page 2 total records",
    page2Result.pagination.records,
    postCount,
  );
  TestValidator.equals("page 2 total pages", page2Result.pagination.pages, 2);
  TestValidator.equals("page 2 has 5 posts", page2Result.data.length, 5);
  // 13. Validate page 2 posts are also by target member
  for (const post of page2Result.data) {
    TestValidator.equals(
      "page 2 post author is target member",
      post.author.id,
      targetMemberId,
    );
  }
  // 14. Validate no duplicate posts across pages
  const page1Ids = page1Result.data.map((p) => p.id);
  const page2Ids = page2Result.data.map((p) => p.id);
  const hasDuplicates = page1Ids.some((id) => page2Ids.includes(id));
  TestValidator.predicate("no duplicate posts across pages", !hasDuplicates);
  // 15. Validate all created posts are retrieved across both pages
  const allRetrievedIds = [...page1Ids, ...page2Ids];
  const allCreatedIds = createdPosts.map((p) => p.id);
  TestValidator.equals(
    "all posts retrieved",
    allRetrievedIds.length,
    allCreatedIds.length,
  );
  // 16. Test with custom limit
  const customLimitResult =
    await api.functional.redditCommunity.member.members.posts.index(
      viewerConnection,
      {
        memberId: targetMemberId,
        body: {
          page: 1,
          limit: 10,
          sort: "new",
        } satisfies IRedditCommunityPost.IRequest,
      },
    );
  typia.assert(customLimitResult);
  TestValidator.equals(
    "custom limit page",
    customLimitResult.pagination.current,
    1,
  );
  TestValidator.equals(
    "custom limit value",
    customLimitResult.pagination.limit,
    10,
  );
  TestValidator.equals(
    "custom limit total records",
    customLimitResult.pagination.records,
    postCount,
  );
  TestValidator.equals(
    "custom limit total pages",
    customLimitResult.pagination.pages,
    3,
  );
  TestValidator.equals(
    "custom limit data length",
    customLimitResult.data.length,
    10,
  );
}
