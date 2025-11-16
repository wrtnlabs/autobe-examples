import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCategory";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformComment";

export async function test_api_comment_retrieval_sorting_new(
  connection: api.IConnection,
) {
  // 1. Create administrator and category
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin: ICommunityPlatformAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: adminEmail,
        password: "Admin@12345",
        username: RandomGenerator.alphabets(10),
        name: RandomGenerator.name(),
        href: "http://localhost:3000/admin/join",
        referrer: "http://localhost:3000",
      } satisfies ICommunityPlatformAdministrator.ICreate,
    });
  typia.assert(admin);

  const category: ICommunityPlatformCategory =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      {
        body: {
          name: "Technology",
          slug: "technology",
          display_order: 1,
        } satisfies ICommunityPlatformCategory.ICreate,
      },
    );
  typia.assert(category);

  // 2. Create member and authenticate
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        username: RandomGenerator.alphabets(8),
        password: "Member@12345",
        href: "http://localhost:3000/join",
        referrer: "http://localhost:3000",
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(member);

  // 3. Create community
  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: "Tech Discussion",
          identifier: RandomGenerator.alphabets(8).toLowerCase(),
          description: "Community for tech discussions",
          visibility: "public",
          post_creation_restriction: "open_to_all",
          post_type_restriction: "all_types",
          category_slug: category.slug,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  // 4. Create post
  const post: ICommunityPlatformPost =
    await api.functional.communityPlatform.member.posts.create(connection, {
      body: {
        community_id: community.id,
        post_type: "text",
        title: "Discussion Topic",
        content_text: "Let's discuss this topic",
      } satisfies ICommunityPlatformPost.ICreate,
    });
  typia.assert(post);

  // 5. Retrieve comments with 'new' sorting (newest first)
  const sortedCommentsPage1: IPageICommunityPlatformComment =
    await api.functional.communityPlatform.posts.comments.index(connection, {
      postId: post.id,
      body: {
        page: 1,
        page_size: 20,
        sort_by: "new",
      } satisfies ICommunityPlatformComment.IRequest,
    });
  typia.assert(sortedCommentsPage1);

  // 6. Validate pagination structure
  TestValidator.predicate(
    "pagination should have valid structure",
    () =>
      sortedCommentsPage1.pagination.current >= 1 &&
      sortedCommentsPage1.pagination.limit >= 1 &&
      sortedCommentsPage1.pagination.records >= 0 &&
      sortedCommentsPage1.pagination.pages >= 0,
  );

  TestValidator.equals(
    "current page should be 1",
    sortedCommentsPage1.pagination.current,
    1,
  );

  // 7. Validate comments structure if any exist
  for (const comment of sortedCommentsPage1.data) {
    typia.assert(comment);
    TestValidator.predicate(
      `comment ${comment.id} should belong to the correct post`,
      () => comment.community_platform_post_id === post.id,
    );
  }

  // 8. Validate sorting - newest first (reverse chronological order)
  if (sortedCommentsPage1.data.length > 1) {
    for (let i = 0; i < sortedCommentsPage1.data.length - 1; i++) {
      const currentTimestamp = new Date(
        sortedCommentsPage1.data[i].created_at,
      ).getTime();
      const nextTimestamp = new Date(
        sortedCommentsPage1.data[i + 1].created_at,
      ).getTime();
      TestValidator.predicate(
        `comment at index ${i} should have newer or equal timestamp than comment at index ${i + 1}`,
        () => currentTimestamp >= nextTimestamp,
      );
    }
  }

  // 9. Verify all timestamps are valid ISO 8601 format
  for (const comment of sortedCommentsPage1.data) {
    TestValidator.predicate(
      `comment ${comment.id} should have valid created_at timestamp in ISO format`,
      () => {
        try {
          const date = new Date(comment.created_at);
          return !isNaN(date.getTime());
        } catch {
          return false;
        }
      },
    );
  }

  // 10. Test pagination with different page sizes
  const sortedCommentsSmallPage: IPageICommunityPlatformComment =
    await api.functional.communityPlatform.posts.comments.index(connection, {
      postId: post.id,
      body: {
        page: 1,
        page_size: 5,
        sort_by: "new",
      } satisfies ICommunityPlatformComment.IRequest,
    });
  typia.assert(sortedCommentsSmallPage);

  TestValidator.predicate(
    "page size should not exceed requested limit",
    () => sortedCommentsSmallPage.data.length <= 5,
  );

  // 11. Verify consistency - same sort should return consistent order
  const sortedCommentsConsistency: IPageICommunityPlatformComment =
    await api.functional.communityPlatform.posts.comments.index(connection, {
      postId: post.id,
      body: {
        page: 1,
        page_size: 20,
        sort_by: "new",
      } satisfies ICommunityPlatformComment.IRequest,
    });
  typia.assert(sortedCommentsConsistency);

  TestValidator.equals(
    "same sort parameters should return same comment IDs in same order",
    sortedCommentsPage1.data.map((c) => c.id),
    sortedCommentsConsistency.data.map((c) => c.id),
  );
}
