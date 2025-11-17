import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityForumAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityForumAuthorizationToken";
import type { ICommunityForumCommunityGroup } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityForumCommunityGroup";
import type { ICommunityForumCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityForumCommunityPost";
import type { ICommunityForumCommunityUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityForumCommunityUser";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityForumCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityForumCommunityPost";

export async function test_api_user_post_search_pagination(
  connection: api.IConnection,
) {
  // 1. Register a new user account
  const userJoin = {
    email: `${RandomGenerator.name(3)}@test.com`,
    password: "password123",
    username: RandomGenerator.name(2).replace(/\s+/g, "_").toLowerCase(),
  } satisfies ICommunityForumCommunityUser.IJoin;
  const user: ICommunityForumCommunityUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: userJoin,
    });
  typia.assert(user);

  // 2. Create a community for posts
  const communityCreate = {
    name: RandomGenerator.name(3).replace(/\s+/g, "-").toLowerCase(),
    slug: RandomGenerator.name(2).replace(/\s+/g, "-").toLowerCase(),
    title: RandomGenerator.name(4),
    description: RandomGenerator.paragraph({
      sentences: 5,
      wordMin: 3,
      wordMax: 8,
    }),
    rules: RandomGenerator.paragraph({ sentences: 3, wordMin: 4, wordMax: 6 }),
    privacy_level: "public",
    status: "active",
  } satisfies ICommunityForumCommunityGroup.ICreate;
  const community: ICommunityForumCommunityGroup =
    await api.functional.communityForum.user.communities.create(connection, {
      body: communityCreate,
    });
  typia.assert(community);

  // 3. Create multiple posts for pagination testing
  const posts = await ArrayUtil.asyncRepeat(25, async (index) => {
    const postCreate = {
      community_forum_community_id: community.id,
      title: `${RandomGenerator.name(3)} Post ${index + 1}`,
      type: "text" as const,
      body: RandomGenerator.content({
        paragraphs: 2,
        sentenceMin: 5,
        sentenceMax: 10,
        wordMin: 3,
        wordMax: 7,
      }),
    } satisfies ICommunityForumCommunityPost.ICreate;

    const post: ICommunityForumCommunityPost =
      await api.functional.communityForum.user.posts.create(connection, {
        body: postCreate,
      });
    typia.assert(post);
    return post;
  });

  // 4. Test pagination functionality for post search results
  // Test page 1 with default limit (20)
  const page1: IPageICommunityForumCommunityPost.ISummary =
    await api.functional.communityForum.user.posts.index(connection, {
      body: {
        community: community.slug,
      },
    });
  typia.assert(page1);

  // Validate first page results
  TestValidator.equals("page 1 current page", page1.pagination.current, 1);
  TestValidator.equals("page 1 limit", page1.pagination.limit, 20);
  TestValidator.equals("page 1 total records", page1.pagination.records, 25);
  TestValidator.equals("page 1 total pages", page1.pagination.pages, 2);
  TestValidator.equals("page 1 data count", page1.data.length, 20);

  // Verify that posts are in descending order by creation time (newest first)
  for (let i = 0; i < page1.data.length - 1; i++) {
    const currentPost = page1.data[i];
    const nextPost = page1.data[i + 1];
    TestValidator.predicate(
      `post ${i} should be newer than post ${i + 1}`,
      () => new Date(currentPost.created_at) >= new Date(nextPost.created_at),
    );
  }

  // Test page 2 with custom limit
  const page2: IPageICommunityForumCommunityPost.ISummary =
    await api.functional.communityForum.user.posts.index(connection, {
      body: {
        community: community.slug,
        page: 2,
        limit: 10,
      },
    });
  typia.assert(page2);

  // Validate second page results
  TestValidator.equals("page 2 current page", page2.pagination.current, 2);
  TestValidator.equals("page 2 limit", page2.pagination.limit, 10);
  TestValidator.equals("page 2 total records", page2.pagination.records, 25);
  TestValidator.equals("page 2 total pages", page2.pagination.pages, 3);
  TestValidator.equals("page 2 data count", page2.data.length, 5);

  // Verify that posts are in descending order by creation time (newest first)
  for (let i = 0; i < page2.data.length - 1; i++) {
    const currentPost = page2.data[i];
    const nextPost = page2.data[i + 1];
    TestValidator.predicate(
      `page 2 post ${i} should be newer than post ${i + 1}`,
      () => new Date(currentPost.created_at) >= new Date(nextPost.created_at),
    );
  }

  // Test empty page (beyond available pages)
  const emptyPage: IPageICommunityForumCommunityPost.ISummary =
    await api.functional.communityForum.user.posts.index(connection, {
      body: {
        community: community.slug,
        page: 10,
        limit: 10,
      },
    });
  typia.assert(emptyPage);

  // Validate empty page results
  TestValidator.equals(
    "empty page current page",
    emptyPage.pagination.current,
    10,
  );
  TestValidator.equals("empty page limit", emptyPage.pagination.limit, 10);
  TestValidator.equals(
    "empty page total records",
    emptyPage.pagination.records,
    25,
  );
  TestValidator.equals("empty page total pages", emptyPage.pagination.pages, 3);
  TestValidator.equals("empty page data count", emptyPage.data.length, 0);

  // Test search functionality with pagination
  const searchResult: IPageICommunityForumCommunityPost.ISummary =
    await api.functional.communityForum.user.posts.index(connection, {
      body: {
        community: community.slug,
        search: "Post 1",
        page: 1,
        limit: 5,
      },
    });
  typia.assert(searchResult);

  // Validate search results
  TestValidator.predicate(
    "search results should contain posts with 'Post 1' in title",
    () => searchResult.data.every((post) => post.title.includes("Post 1")),
  );

  // Test different sort options
  const sortedByNew: IPageICommunityForumCommunityPost.ISummary =
    await api.functional.communityForum.user.posts.index(connection, {
      body: {
        community: community.slug,
        sort: "new",
        page: 1,
        limit: 5,
      },
    });
  typia.assert(sortedByNew);

  // Validate sorting
  for (let i = 0; i < sortedByNew.data.length - 1; i++) {
    const currentPost = sortedByNew.data[i];
    const nextPost = sortedByNew.data[i + 1];
    TestValidator.predicate(
      `sorted posts should be in descending order by creation time`,
      () => new Date(currentPost.created_at) >= new Date(nextPost.created_at),
    );
  }
}
