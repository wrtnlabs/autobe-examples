import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditClonePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditClonePost";
import type { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import type { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import type { IRedditClonePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePost";
import type { IRedditClonePostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePostImage";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_clone_member_communities_create } from "../../../generate/generate_random_reddit_clone_member_communities_create";
import { generate_random_reddit_clone_member_posts_create } from "../../../generate/generate_random_reddit_clone_member_posts_create";
import { prepare_random_reddit_clone_community } from "../../../prepare/prepare_random_reddit_clone_community";
import { prepare_random_reddit_clone_post } from "../../../prepare/prepare_random_reddit_clone_post";

/**
 * Test pagination behavior and edge cases for the member's post history endpoint.
 *
 * This test verifies:
 * 1. Default pagination returns 20 posts per page when page_size is not specified
 * 2. Custom page_size values (1-100) correctly control the number of posts per page
 * 3. Page navigation correctly moves through multiple pages of results
 * 4. The current page number in pagination metadata matches the requested page parameter
 * 5. The pages count is correctly calculated as ceiling(records / limit)
 * 6. The final page may contain fewer posts than the page_size when total posts don't divide evenly
 * 7. Soft-deleted posts are excluded from both the results and the total records count
 * 8. Requesting a page beyond the total pages returns an empty data array with correct pagination metadata
 */
export async function test_api_member_post_history_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate member user
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
      username: RandomGenerator.alphabets(8),
      display_name: RandomGenerator.name(2),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditCloneMember.IJoin,
  });
  typia.assert(member);
  // 2. Create a community for testing
  const community =
    await generate_random_reddit_clone_member_communities_create(
      memberConnection,
      {},
    );
  typia.assert(community);
  // 3. Create 25 posts to test pagination (exceeds default page_size of 20)
  const posts: IRedditClonePost[] = [];
  for (let i = 0; i < 25; i++) {
    const post = await generate_random_reddit_clone_member_posts_create(
      memberConnection,
      {
        body: {
          title: `Test Post ${i + 1} - ${RandomGenerator.paragraph({ sentences: 2 })}`,
          postType: "text",
          communityId: community.id,
          content: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IRedditClonePost.ICreate,
      },
    );
    typia.assert(post);
    posts.push(post);
  }
  // 4. Test default pagination (page_size=20, page=1)
  const defaultPage = await api.functional.redditClone.member.me.posts.index(
    memberConnection,
    {
      body: {
        page: 1,
      } satisfies IRedditClonePost.IRequest,
    },
  );
  typia.assert(defaultPage);
  TestValidator.equals(
    "default page_size is 20",
    defaultPage.pagination.limit,
    20,
  );
  TestValidator.equals("default page is 1", defaultPage.pagination.current, 1);
  TestValidator.equals(
    "total records is 25",
    defaultPage.pagination.records,
    25,
  );
  TestValidator.equals("total pages is 2", defaultPage.pagination.pages, 2);
  TestValidator.equals("first page has 20 items", defaultPage.data.length, 20);
  // 5. Test custom page_size = 10
  const customPageSize = await api.functional.redditClone.member.me.posts.index(
    memberConnection,
    {
      body: {
        page: 1,
        page_size: 10,
      } satisfies IRedditClonePost.IRequest,
    },
  );
  typia.assert(customPageSize);
  TestValidator.equals(
    "custom page_size is 10",
    customPageSize.pagination.limit,
    10,
  );
  TestValidator.equals(
    "total pages with page_size 10",
    customPageSize.pagination.pages,
    3,
  );
  TestValidator.equals(
    "first page has 10 items",
    customPageSize.data.length,
    10,
  );
  // 6. Test page navigation with page_size = 10
  const page2 = await api.functional.redditClone.member.me.posts.index(
    memberConnection,
    {
      body: {
        page: 2,
        page_size: 10,
      } satisfies IRedditClonePost.IRequest,
    },
  );
  typia.assert(page2);
  TestValidator.equals("page 2 current is 2", page2.pagination.current, 2);
  TestValidator.equals("page 2 has 10 items", page2.data.length, 10);
  const page3 = await api.functional.redditClone.member.me.posts.index(
    memberConnection,
    {
      body: {
        page: 3,
        page_size: 10,
      } satisfies IRedditClonePost.IRequest,
    },
  );
  typia.assert(page3);
  TestValidator.equals("page 3 current is 3", page3.pagination.current, 3);
  TestValidator.equals("page 3 has 5 items (remaining)", page3.data.length, 5);
  // 7. Test requesting beyond total pages
  const beyondPages = await api.functional.redditClone.member.me.posts.index(
    memberConnection,
    {
      body: {
        page: 10,
        page_size: 10,
      } satisfies IRedditClonePost.IRequest,
    },
  );
  typia.assert(beyondPages);
  TestValidator.equals(
    "beyond pages current is 10",
    beyondPages.pagination.current,
    10,
  );
  TestValidator.equals(
    "beyond pages has empty data",
    beyondPages.data.length,
    0,
  );
  TestValidator.equals(
    "beyond pages records is still 25",
    beyondPages.pagination.records,
    25,
  );
  // 8. Delete one post to test soft-delete exclusion
  const deletedPostId = posts[5].id;
  await api.functional.redditClone.member.posts.erase(memberConnection, {
    postId: deletedPostId,
  });
  // 9. Verify soft-deleted post is excluded from results and count
  const afterDelete = await api.functional.redditClone.member.me.posts.index(
    memberConnection,
    {
      body: {
        page: 1,
        page_size: 20,
      } satisfies IRedditClonePost.IRequest,
    },
  );
  typia.assert(afterDelete);
  TestValidator.equals(
    "records after delete is 24",
    afterDelete.pagination.records,
    24,
  );
  TestValidator.equals(
    "total pages after delete is 2",
    afterDelete.pagination.pages,
    2,
  );
  TestValidator.equals(
    "first page has 20 items after delete",
    afterDelete.data.length,
    20,
  );
  // Verify deleted post is not in results
  const deletedPostExists = afterDelete.data.some(
    (p) => p.id === deletedPostId,
  );
  TestValidator.predicate("deleted post not in results", !deletedPostExists);
  // Also check page 2 to ensure deleted post is not there
  const afterDeletePage2 =
    await api.functional.redditClone.member.me.posts.index(memberConnection, {
      body: {
        page: 2,
        page_size: 20,
      } satisfies IRedditClonePost.IRequest,
    });
  typia.assert(afterDeletePage2);
  const deletedPostExistsPage2 = afterDeletePage2.data.some(
    (p) => p.id === deletedPostId,
  );
  TestValidator.predicate(
    "deleted post not in page 2",
    !deletedPostExistsPage2,
  );
}
