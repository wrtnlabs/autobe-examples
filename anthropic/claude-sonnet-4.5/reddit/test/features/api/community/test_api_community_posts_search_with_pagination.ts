import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditLikePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditLikePost";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import type { IRedditLikePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePost";

export async function test_api_community_posts_search_with_pagination(
  connection: api.IConnection,
) {
  // Step 1: Create member account for community creation and post authoring
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member: IRedditLikeMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        username: typia.random<
          string &
            tags.MinLength<3> &
            tags.MaxLength<20> &
            tags.Pattern<"^[a-zA-Z0-9_-]+$">
        >(),
        email: memberEmail,
        password: typia.random<string & tags.MinLength<8>>(),
      } satisfies IRedditLikeMember.ICreate,
    });
  typia.assert(member);

  // Step 2: Create community for post pagination testing
  const community: IRedditLikeCommunity =
    await api.functional.redditLike.member.communities.create(connection, {
      body: {
        code: typia.random<
          string &
            tags.MinLength<3> &
            tags.MaxLength<25> &
            tags.Pattern<"^[a-zA-Z0-9_]+$">
        >(),
        name: typia.random<string & tags.MinLength<3> & tags.MaxLength<25>>(),
        description: typia.random<
          string & tags.MinLength<10> & tags.MaxLength<500>
        >(),
      } satisfies IRedditLikeCommunity.ICreate,
    });
  typia.assert(community);

  // Step 3: Create multiple posts (60 posts to test pagination across multiple pages)
  const postCount = 60;
  const createdPosts: IRedditLikePost[] = await ArrayUtil.asyncRepeat(
    postCount,
    async (index) => {
      const postTypes = ["text", "link", "image"] as const;
      const postType = RandomGenerator.pick(postTypes);

      const titleText = `Test Post ${index + 1} - ${RandomGenerator.name()}`;

      if (postType === "text") {
        const post = await api.functional.redditLike.member.posts.create(
          connection,
          {
            body: {
              community_id: community.id,
              type: "text",
              title: titleText,
              body: RandomGenerator.paragraph({ sentences: 5 }),
            } satisfies IRedditLikePost.ICreate,
          },
        );
        return post;
      } else if (postType === "link") {
        const post = await api.functional.redditLike.member.posts.create(
          connection,
          {
            body: {
              community_id: community.id,
              type: "link",
              title: titleText,
              url: typia.random<string & tags.MaxLength<2000>>(),
            } satisfies IRedditLikePost.ICreate,
          },
        );
        return post;
      } else {
        const post = await api.functional.redditLike.member.posts.create(
          connection,
          {
            body: {
              community_id: community.id,
              type: "image",
              title: titleText,
              image_url: typia.random<string>(),
              caption: RandomGenerator.paragraph({ sentences: 2 }),
            } satisfies IRedditLikePost.ICreate,
          },
        );
        return post;
      }
    },
  );

  typia.assert(createdPosts);
  TestValidator.equals("created post count", createdPosts.length, postCount);

  // Step 4: Test pagination with default parameters (first page)
  const firstPage: IPageIRedditLikePost.ISummary =
    await api.functional.redditLike.communities.posts.searchPosts(connection, {
      communityId: community.id,
      body: {} satisfies IRedditLikeCommunity.IPostSearchRequest,
    });
  typia.assert(firstPage);
  TestValidator.predicate("first page has data", firstPage.data.length > 0);
  TestValidator.equals(
    "total records matches created posts",
    firstPage.pagination.records,
    postCount,
  );

  // Step 5: Test pagination with specific page size (limit 10)
  const limitedPage: IPageIRedditLikePost.ISummary =
    await api.functional.redditLike.communities.posts.searchPosts(connection, {
      communityId: community.id,
      body: {
        limit: 10,
      } satisfies IRedditLikeCommunity.IPostSearchRequest,
    });
  typia.assert(limitedPage);
  TestValidator.equals(
    "limited page returns correct count",
    limitedPage.data.length,
    10,
  );
  TestValidator.equals(
    "limited page limit is correct",
    limitedPage.pagination.limit,
    10,
  );

  // Step 6: Test pagination with page offset (page 2 with limit 10)
  const secondPage: IPageIRedditLikePost.ISummary =
    await api.functional.redditLike.communities.posts.searchPosts(connection, {
      communityId: community.id,
      body: {
        page: 2,
        limit: 10,
      } satisfies IRedditLikeCommunity.IPostSearchRequest,
    });
  typia.assert(secondPage);
  TestValidator.equals(
    "second page current is 2",
    secondPage.pagination.current,
    2,
  );
  TestValidator.equals(
    "second page returns correct count",
    secondPage.data.length,
    10,
  );

  // Step 7: Verify pagination maintains consistent ordering (no overlap between pages)
  const page1Ids = limitedPage.data.map((p) => p.id);
  const page2Ids = secondPage.data.map((p) => p.id);

  const hasOverlap = page1Ids.some((id) => page2Ids.includes(id));
  TestValidator.predicate(
    "pages have no overlapping posts",
    hasOverlap === false,
  );

  // Step 8: Test pagination metadata accuracy (total pages calculation)
  const expectedPages = Math.ceil(postCount / 10);
  TestValidator.equals(
    "total pages calculated correctly",
    limitedPage.pagination.pages,
    expectedPages,
  );

  // Step 9: Test pagination with different page sizes
  const largeLimitPage: IPageIRedditLikePost.ISummary =
    await api.functional.redditLike.communities.posts.searchPosts(connection, {
      communityId: community.id,
      body: {
        limit: 25,
      } satisfies IRedditLikeCommunity.IPostSearchRequest,
    });
  typia.assert(largeLimitPage);
  TestValidator.equals(
    "large limit page returns correct count",
    largeLimitPage.data.length,
    25,
  );

  // Step 10: Test last page (may have fewer items than limit)
  const lastPageNum = expectedPages;
  const lastPage: IPageIRedditLikePost.ISummary =
    await api.functional.redditLike.communities.posts.searchPosts(connection, {
      communityId: community.id,
      body: {
        page: lastPageNum,
        limit: 10,
      } satisfies IRedditLikeCommunity.IPostSearchRequest,
    });
  typia.assert(lastPage);
  TestValidator.predicate("last page has posts", lastPage.data.length > 0);
  TestValidator.predicate(
    "last page count is valid",
    lastPage.data.length <= 10,
  );
}
