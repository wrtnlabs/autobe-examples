import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCategory";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformPost";

export async function test_api_community_posts_sorting_by_creation_date(
  connection: api.IConnection,
) {
  // Step 1: Create administrator and establish category for communities
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const administrator: ICommunityPlatformAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: adminEmail,
        password: RandomGenerator.alphabets(12),
        username: RandomGenerator.alphabets(10),
        name: RandomGenerator.name(),
        href: "http://localhost:3000",
      } satisfies ICommunityPlatformAdministrator.ICreate,
    });
  typia.assert(administrator);

  // Step 2: Create a category for the community
  const category: ICommunityPlatformCategory =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      {
        body: {
          name: RandomGenerator.name(2),
          slug: RandomGenerator.alphabets(8).toLowerCase(),
          display_order: 1,
        } satisfies ICommunityPlatformCategory.ICreate,
      },
    );
  typia.assert(category);

  // Step 3: Create member account
  const memberEmail: string = typia.random<string & tags.Format<"email">>();
  const member: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        username: RandomGenerator.alphabets(10),
        password: RandomGenerator.alphabets(12),
        href: "http://localhost:3000",
        referrer: "http://localhost:3000",
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(member);

  // Step 4: Create a community in the category
  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: RandomGenerator.name(2),
          identifier: RandomGenerator.alphabets(8).toLowerCase(),
          description: RandomGenerator.paragraph({ sentences: 3 }),
          visibility: "public",
          post_creation_restriction: "open_to_all",
          post_type_restriction: "all_types",
          category_slug: category.slug,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  // Step 5: Create multiple posts with different creation times
  const posts: ICommunityPlatformPost[] = await ArrayUtil.asyncRepeat(
    5,
    async (index) => {
      const post: ICommunityPlatformPost =
        await api.functional.communityPlatform.member.posts.create(connection, {
          body: {
            community_id: community.id,
            post_type: "text",
            title: `Post ${index + 1}: ${RandomGenerator.name()}`,
            content_text: RandomGenerator.paragraph({ sentences: 5 }),
          } satisfies ICommunityPlatformPost.ICreate,
        });
      typia.assert(post);
      return post;
    },
  );

  // Step 6: Retrieve posts sorted by creation date in ascending order (oldest first)
  const ascendingResult: IPageICommunityPlatformPost.ISummary =
    await api.functional.communityPlatform.communities.posts.index(connection, {
      communityId: community.id,
      body: {
        page: 1,
        limit: 100,
        sort_by: "createdAt",
        sort_order: "asc",
      } satisfies ICommunityPlatformPost.IRequest,
    });
  typia.assert(ascendingResult);

  // Step 7: Retrieve posts sorted by creation date in descending order (newest first)
  const descendingResult: IPageICommunityPlatformPost.ISummary =
    await api.functional.communityPlatform.communities.posts.index(connection, {
      communityId: community.id,
      body: {
        page: 1,
        limit: 100,
        sort_by: "createdAt",
        sort_order: "desc",
      } satisfies ICommunityPlatformPost.IRequest,
    });
  typia.assert(descendingResult);

  // Step 8: Verify ascending order (oldest first)
  for (let i = 0; i < ascendingResult.data.length - 1; i++) {
    const currentPost = ascendingResult.data[i];
    const nextPost = ascendingResult.data[i + 1];
    TestValidator.predicate(
      `ascending sort: post ${i} created_at should be <= post ${i + 1} created_at`,
      new Date(currentPost.created_at) <= new Date(nextPost.created_at),
    );
  }

  // Step 9: Verify descending order (newest first)
  for (let i = 0; i < descendingResult.data.length - 1; i++) {
    const currentPost = descendingResult.data[i];
    const nextPost = descendingResult.data[i + 1];
    TestValidator.predicate(
      `descending sort: post ${i} created_at should be >= post ${i + 1} created_at`,
      new Date(currentPost.created_at) >= new Date(nextPost.created_at),
    );
  }

  // Step 10: Verify pagination works with sorting
  const pagedResult: IPageICommunityPlatformPost.ISummary =
    await api.functional.communityPlatform.communities.posts.index(connection, {
      communityId: community.id,
      body: {
        page: 1,
        limit: 2,
        sort_by: "createdAt",
        sort_order: "desc",
      } satisfies ICommunityPlatformPost.IRequest,
    });
  typia.assert(pagedResult);

  TestValidator.equals(
    "pagination limit should be respected",
    pagedResult.data.length,
    Math.min(2, pagedResult.pagination.records),
  );

  TestValidator.predicate(
    "pagination info should be correct",
    pagedResult.pagination.current === 1 &&
      pagedResult.pagination.limit === 2 &&
      pagedResult.pagination.records > 0,
  );

  // Step 11: Verify sorting persists with other filters (e.g., visibility status)
  const filteredSortedResult: IPageICommunityPlatformPost.ISummary =
    await api.functional.communityPlatform.communities.posts.index(connection, {
      communityId: community.id,
      body: {
        page: 1,
        limit: 100,
        visibility_status: "public",
        sort_by: "createdAt",
        sort_order: "asc",
      } satisfies ICommunityPlatformPost.IRequest,
    });
  typia.assert(filteredSortedResult);

  // Verify sorted order in filtered results
  for (let i = 0; i < filteredSortedResult.data.length - 1; i++) {
    const currentPost = filteredSortedResult.data[i];
    const nextPost = filteredSortedResult.data[i + 1];
    TestValidator.predicate(
      `filtered ascending sort: post ${i} created_at should be <= post ${i + 1} created_at`,
      new Date(currentPost.created_at) <= new Date(nextPost.created_at),
    );
  }
}
