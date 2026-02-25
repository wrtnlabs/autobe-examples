import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
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

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";
import { generate_random_community_platform_user_posts_create } from "../../../generate/generate_random_community_platform_user_posts_create";
import { prepare_random_community_platform_post } from "../../../prepare/prepare_random_community_platform_post";

export async function test_api_admin_post_search_pagination_boundaries(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection and authenticate with fixed credentials
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: "admin-pagination-test@example.com",
      password: "admin123",
      display_name: "Admin Pagination Test",
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  // Create user connection and authenticate
  const userConnection: api.IConnection = { host: connection.host };
  await authorize_user_join(userConnection, {
    body: {
      email: "user-pagination-test@example.com",
      password: "user123",
      username: "paginationtestuser",
    } satisfies ICommunityPlatformUser.IJoin,
  });
  // Create multiple test posts using existing community (assuming 'general' community exists)
  const totalPosts = 105; // More than typical page size
  const posts: ICommunityPlatformPost[] = [];
  for (let i = 0; i < totalPosts; i++) {
    const post = await generate_random_community_platform_user_posts_create(
      userConnection,
      {
        body: {
          title: `Test Post ${i + 1} - ${RandomGenerator.paragraph({ sentences: 1 })}`,
          community_name: "general", // Use common community name
          post_type: "text",
          text_content: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies ICommunityPlatformPost.ICreate,
      },
    );
    typia.assert(post);
    posts.push(post);
  }
  // Test pagination with different page sizes
  const pageSizes = [1, 50, 100] as const;
  for (const limit of pageSizes) {
    // Test first page
    const firstPage = await api.functional.communityPlatform.admin.posts.search(
      adminConnection,
      {
        body: {
          page: 1,
          limit: limit satisfies number as number &
            tags.Type<"int32"> &
            tags.Minimum<1> &
            tags.Maximum<100>,
        } satisfies ICommunityPlatformPost.IRequest,
      },
    );
    typia.assert(firstPage);
    TestValidator.equals(
      "first page current should be 1",
      firstPage.pagination.current,
      1,
    );
    TestValidator.equals(
      "first page limit should match",
      firstPage.pagination.limit,
      limit,
    );
    TestValidator.predicate(
      "first page records should be at least total posts",
      firstPage.pagination.records >= totalPosts,
    );
    TestValidator.predicate(
      "first page data length should be <= limit",
      firstPage.data.length <= limit,
    );
    TestValidator.predicate(
      "pages should be calculated correctly",
      firstPage.pagination.pages ===
        Math.ceil(firstPage.pagination.records / limit),
    );
    // Test last page
    const lastPageNumber = firstPage.pagination.pages;
    const lastPage = await api.functional.communityPlatform.admin.posts.search(
      adminConnection,
      {
        body: {
          page: lastPageNumber,
          limit: limit satisfies number as number &
            tags.Type<"int32"> &
            tags.Minimum<1> &
            tags.Maximum<100>,
        } satisfies ICommunityPlatformPost.IRequest,
      },
    );
    typia.assert(lastPage);
    TestValidator.equals(
      "last page current should be last page number",
      lastPage.pagination.current,
      lastPageNumber,
    );
    TestValidator.equals(
      "last page limit should match",
      lastPage.pagination.limit,
      limit,
    );
    TestValidator.equals(
      "last page records should match total",
      lastPage.pagination.records,
      firstPage.pagination.records,
    );
    // Test page beyond available data
    const beyondPage =
      await api.functional.communityPlatform.admin.posts.search(
        adminConnection,
        {
          body: {
            page: lastPageNumber + 1,
            limit: limit satisfies number as number &
              tags.Type<"int32"> &
              tags.Minimum<1> &
              tags.Maximum<100>,
          } satisfies ICommunityPlatformPost.IRequest,
        },
      );
    typia.assert(beyondPage);
    TestValidator.equals(
      "beyond page should have empty data",
      beyondPage.data.length,
      0,
    );
    TestValidator.equals(
      "beyond page current should be requested page",
      beyondPage.pagination.current,
      lastPageNumber + 1,
    );
    TestValidator.equals(
      "beyond page records should match total",
      beyondPage.pagination.records,
      firstPage.pagination.records,
    );
  }
  // Test empty search results
  const emptySearch = await api.functional.communityPlatform.admin.posts.search(
    adminConnection,
    {
      body: {
        search: "nonexistentsearchtermthatshouldnotmatchanything",
        page: 1,
        limit: 10 satisfies number as number &
          tags.Type<"int32"> &
          tags.Minimum<1> &
          tags.Maximum<100>,
      } satisfies ICommunityPlatformPost.IRequest,
    },
  );
  typia.assert(emptySearch);
  TestValidator.equals(
    "empty search should have zero records",
    emptySearch.pagination.records,
    0,
  );
  TestValidator.equals(
    "empty search should have zero pages",
    emptySearch.pagination.pages,
    0,
  );
  TestValidator.equals(
    "empty search should have empty data",
    emptySearch.data.length,
    0,
  );
  TestValidator.equals(
    "empty search current page should be 1",
    emptySearch.pagination.current,
    1,
  );
  // Test minimum page size (1)
  const minPage = await api.functional.communityPlatform.admin.posts.search(
    adminConnection,
    {
      body: {
        page: 1,
        limit: 1 satisfies number as number &
          tags.Type<"int32"> &
          tags.Minimum<1> &
          tags.Maximum<100>,
      } satisfies ICommunityPlatformPost.IRequest,
    },
  );
  typia.assert(minPage);
  TestValidator.equals(
    "min page size should have 1 item",
    minPage.data.length,
    1,
  );
  TestValidator.equals(
    "min page limit should be 1",
    minPage.pagination.limit,
    1,
  );
  // Test maximum page size (100)
  const maxPage = await api.functional.communityPlatform.admin.posts.search(
    adminConnection,
    {
      body: {
        page: 1,
        limit: 100 satisfies number as number &
          tags.Type<"int32"> &
          tags.Minimum<1> &
          tags.Maximum<100>,
      } satisfies ICommunityPlatformPost.IRequest,
    },
  );
  typia.assert(maxPage);
  TestValidator.predicate(
    "max page data length should be <= 100",
    maxPage.data.length <= 100,
  );
  TestValidator.equals(
    "max page limit should be 100",
    maxPage.pagination.limit,
    100,
  );
}
