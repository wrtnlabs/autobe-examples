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

export async function test_api_comments_search_by_visibility_status(
  connection: api.IConnection,
) {
  // Step 1: Create administrator account for moderation
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin: ICommunityPlatformAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: adminEmail,
        password: "AdminPassword123!",
        username: `admin_${RandomGenerator.alphaNumeric(8)}`,
        name: "Test Administrator",
        href: "http://localhost:3000/admin",
        referrer: "http://localhost:3000",
      } satisfies ICommunityPlatformAdministrator.ICreate,
    });
  typia.assert(admin);

  // Step 2: Create a category for community
  const category: ICommunityPlatformCategory =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      {
        body: {
          name: "Technology",
          slug: `tech_${RandomGenerator.alphaNumeric(6)}`,
          display_order: 1,
          description: "Technology discussions",
        } satisfies ICommunityPlatformCategory.ICreate,
      },
    );
  typia.assert(category);

  // Step 3: Create member account
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        username: `member_${RandomGenerator.alphaNumeric(8)}`,
        password: "MemberPassword123!",
        href: "http://localhost:3000/join",
        referrer: "http://localhost:3000",
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(member);

  // Step 4: Create a community
  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: "Test Community",
          identifier: `test_${RandomGenerator.alphaNumeric(8)}`,
          description: "A test community for comments",
          visibility: "public",
          post_creation_restriction: "open_to_all",
          post_type_restriction: "all_types",
          category_slug: category.slug,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  // Step 5: Create posts for commenting
  const post1: ICommunityPlatformPost =
    await api.functional.communityPlatform.member.posts.create(connection, {
      body: {
        community_id: community.id,
        post_type: "text",
        title: "Test Post 1",
        content_text: "This is test post 1",
      } satisfies ICommunityPlatformPost.ICreate,
    });
  typia.assert(post1);

  const post2: ICommunityPlatformPost =
    await api.functional.communityPlatform.member.posts.create(connection, {
      body: {
        community_id: community.id,
        post_type: "text",
        title: "Test Post 2",
        content_text: "This is test post 2",
      } satisfies ICommunityPlatformPost.ICreate,
    });
  typia.assert(post2);

  // Step 6: Create visible comments
  const visibleComment1: ICommunityPlatformComment =
    await api.functional.communityPlatform.member.comments.create(connection, {
      body: {
        post_id: post1.id,
        content: "This is a visible comment",
      } satisfies ICommunityPlatformComment.ICreate,
    });
  typia.assert(visibleComment1);

  const visibleComment2: ICommunityPlatformComment =
    await api.functional.communityPlatform.member.comments.create(connection, {
      body: {
        post_id: post2.id,
        content: "Another visible comment",
      } satisfies ICommunityPlatformComment.ICreate,
    });
  typia.assert(visibleComment2);

  // Step 7: Test filtering by visible status (should return visible comments)
  const visibleResults: IPageICommunityPlatformComment =
    await api.functional.communityPlatform.comments.index(connection, {
      body: {
        page: 1,
        page_size: 20,
        visibility_status: "visible",
      } satisfies ICommunityPlatformComment.IRequest,
    });
  typia.assert(visibleResults);
  TestValidator.predicate(
    "visible comments should be returned",
    visibleResults.data.length > 0,
  );
  TestValidator.predicate(
    "all returned comments should have visible status",
    visibleResults.data.every((c) => c.visibility_status === "visible"),
  );

  // Step 8: Test default visibility (should return visible comments by default)
  const defaultResults: IPageICommunityPlatformComment =
    await api.functional.communityPlatform.comments.index(connection, {
      body: {
        page: 1,
        page_size: 20,
      } satisfies ICommunityPlatformComment.IRequest,
    });
  typia.assert(defaultResults);
  TestValidator.predicate(
    "default filter should return visible comments",
    defaultResults.data.length > 0,
  );

  // Step 9: Test filtering by deleted status (should return no deleted comments initially)
  const deletedResults: IPageICommunityPlatformComment =
    await api.functional.communityPlatform.comments.index(connection, {
      body: {
        page: 1,
        page_size: 20,
        visibility_status: "deleted",
      } satisfies ICommunityPlatformComment.IRequest,
    });
  typia.assert(deletedResults);
  TestValidator.predicate(
    "all deleted comments should have deleted status",
    deletedResults.data.every((c) => c.visibility_status === "deleted"),
  );

  // Step 10: Test filtering by removed_by_moderator status
  const removedResults: IPageICommunityPlatformComment =
    await api.functional.communityPlatform.comments.index(connection, {
      body: {
        page: 1,
        page_size: 20,
        visibility_status: "removed_by_moderator",
      } satisfies ICommunityPlatformComment.IRequest,
    });
  typia.assert(removedResults);
  TestValidator.predicate(
    "all removed comments should have removed_by_moderator status",
    removedResults.data.every(
      (c) => c.visibility_status === "removed_by_moderator",
    ),
  );

  // Step 11: Verify pagination works with visibility filter
  TestValidator.predicate(
    "pagination info should be present",
    removedResults.pagination !== undefined,
  );
  TestValidator.predicate(
    "current page should be 1",
    removedResults.pagination.current === 1,
  );
  TestValidator.predicate(
    "page limit should be 20",
    removedResults.pagination.limit === 20,
  );
}
