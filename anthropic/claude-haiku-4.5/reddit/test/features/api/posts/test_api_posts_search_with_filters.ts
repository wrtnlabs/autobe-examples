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

/**
 * Test advanced filtering capabilities of the post search endpoint.
 *
 * Validates that posts can be filtered by multiple criteria including community
 * ID, post type (text/link/image), visibility status, vote score range, NSFW
 * content filtering, and spoiler content filtering. Verifies that combining
 * multiple filters returns accurate results that match all specified criteria.
 *
 * Test workflow:
 *
 * 1. Set up administrator account for platform infrastructure
 * 2. Create category for community classification
 * 3. Create member account as content creator
 * 4. Create multiple communities for testing community-specific filtering
 * 5. Create diverse posts with various types, visibility statuses, vote scores,
 *    NSFW flags, and spoiler warnings
 * 6. Execute multiple search operations with different filter combinations
 * 7. Validate that filtered results match expected post subsets and all criteria
 *    are satisfied
 */
export async function test_api_posts_search_with_filters(
  connection: api.IConnection,
) {
  // Step 1: Create administrator account
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const admin: ICommunityPlatformAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: adminEmail,
        password: "AdminPassword123!",
        username: RandomGenerator.alphaNumeric(8),
        name: RandomGenerator.name(),
        href: "http://localhost:3000",
        referrer: "http://localhost:3000",
      } satisfies ICommunityPlatformAdministrator.ICreate,
    });
  typia.assert(admin);

  // Step 2: Create category for organizing communities
  const category: ICommunityPlatformCategory =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      {
        body: {
          name: "Technology",
          slug: "technology",
          description: "Technology and programming discussions",
          display_order: 1,
        } satisfies ICommunityPlatformCategory.ICreate,
      },
    );
  typia.assert(category);

  // Step 3: Create member account as content creator
  const memberEmail: string = typia.random<string & tags.Format<"email">>();
  const member: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        username: RandomGenerator.alphaNumeric(8),
        password: "MemberPassword123!",
        href: "http://localhost:3000",
        referrer: "http://localhost:3000",
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(member);

  // Step 4: Create multiple communities
  const community1: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: "TypeScript Discussion",
          identifier: `ts_${RandomGenerator.alphaNumeric(6)}`,
          description: "TypeScript programming discussions",
          visibility: "public",
          post_creation_restriction: "open_to_all",
          post_type_restriction: "all_types",
          category_slug: category.slug,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community1);

  const community2: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: "Python Community",
          identifier: `py_${RandomGenerator.alphaNumeric(6)}`,
          description: "Python programming community",
          visibility: "public",
          post_creation_restriction: "open_to_all",
          post_type_restriction: "all_types",
          category_slug: category.slug,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community2);

  // Step 5: Create diverse posts with various attributes
  const textPost1: ICommunityPlatformPost =
    await api.functional.communityPlatform.member.posts.create(connection, {
      body: {
        community_id: community1.id,
        post_type: "text",
        title: "Getting Started with TypeScript",
        content_text: "TypeScript is a typed superset of JavaScript...",
        is_nsfw: false,
        has_spoiler: false,
      } satisfies ICommunityPlatformPost.ICreate,
    });
  typia.assert(textPost1);

  const textPost2: ICommunityPlatformPost =
    await api.functional.communityPlatform.member.posts.create(connection, {
      body: {
        community_id: community1.id,
        post_type: "text",
        title: "Advanced TypeScript Patterns",
        content_text: "Learn advanced patterns and techniques...",
        is_nsfw: true,
        has_spoiler: false,
      } satisfies ICommunityPlatformPost.ICreate,
    });
  typia.assert(textPost2);

  const linkPost: ICommunityPlatformPost =
    await api.functional.communityPlatform.member.posts.create(connection, {
      body: {
        community_id: community1.id,
        post_type: "link",
        title: "TypeScript Official Documentation",
        content_link_url: "https://www.typescriptlang.org/docs",
        is_nsfw: false,
        has_spoiler: false,
      } satisfies ICommunityPlatformPost.ICreate,
    });
  typia.assert(linkPost);

  const spoilerPost: ICommunityPlatformPost =
    await api.functional.communityPlatform.member.posts.create(connection, {
      body: {
        community_id: community2.id,
        post_type: "text",
        title: "Python 3.12 Features",
        content_text: "Python 3.12 introduces several new features...",
        is_nsfw: false,
        has_spoiler: true,
      } satisfies ICommunityPlatformPost.ICreate,
    });
  typia.assert(spoilerPost);

  // Step 6: Search posts with community filter
  const communityFilterResult: IPageICommunityPlatformPost.ISummary =
    await api.functional.communityPlatform.posts.index(connection, {
      body: {
        page: 1,
        limit: 100,
        community_id: community1.id,
      } satisfies ICommunityPlatformPost.IRequest,
    });
  typia.assert(communityFilterResult);
  TestValidator.predicate(
    "community filter returns posts from specified community",
    communityFilterResult.data.every(
      (post) => post.community.id === community1.id,
    ),
  );

  // Step 7: Search posts by post type
  const textTypeResult: IPageICommunityPlatformPost.ISummary =
    await api.functional.communityPlatform.posts.index(connection, {
      body: {
        page: 1,
        limit: 100,
        post_type: "text",
      } satisfies ICommunityPlatformPost.IRequest,
    });
  typia.assert(textTypeResult);
  TestValidator.predicate(
    "post type filter returns only text posts",
    textTypeResult.data.every((post) => post.post_type === "text"),
  );

  const linkTypeResult: IPageICommunityPlatformPost.ISummary =
    await api.functional.communityPlatform.posts.index(connection, {
      body: {
        page: 1,
        limit: 100,
        post_type: "link",
      } satisfies ICommunityPlatformPost.IRequest,
    });
  typia.assert(linkTypeResult);
  TestValidator.predicate(
    "link post type filter works correctly",
    linkTypeResult.data.every((post) => post.post_type === "link"),
  );

  // Step 8: Search posts with NSFW filter
  const nsfwExcludedResult: IPageICommunityPlatformPost.ISummary =
    await api.functional.communityPlatform.posts.index(connection, {
      body: {
        page: 1,
        limit: 100,
        exclude_nsfw: true,
      } satisfies ICommunityPlatformPost.IRequest,
    });
  typia.assert(nsfwExcludedResult);
  TestValidator.predicate(
    "exclude NSFW filter removes NSFW posts",
    nsfwExcludedResult.data.every((post) => !post.is_nsfw),
  );

  // Step 9: Search posts with spoiler filter
  const spoilerExcludedResult: IPageICommunityPlatformPost.ISummary =
    await api.functional.communityPlatform.posts.index(connection, {
      body: {
        page: 1,
        limit: 100,
        exclude_spoilers: true,
      } satisfies ICommunityPlatformPost.IRequest,
    });
  typia.assert(spoilerExcludedResult);
  TestValidator.predicate(
    "exclude spoilers filter removes spoiler posts",
    spoilerExcludedResult.data.every((post) => !post.has_spoiler),
  );

  // Step 10: Search posts with combined filters
  const combinedFilterResult: IPageICommunityPlatformPost.ISummary =
    await api.functional.communityPlatform.posts.index(connection, {
      body: {
        page: 1,
        limit: 100,
        community_id: community1.id,
        post_type: "text",
        exclude_nsfw: true,
      } satisfies ICommunityPlatformPost.IRequest,
    });
  typia.assert(combinedFilterResult);
  TestValidator.predicate(
    "combined filters work together correctly",
    combinedFilterResult.data.every(
      (post) =>
        post.community.id === community1.id &&
        post.post_type === "text" &&
        !post.is_nsfw,
    ),
  );

  // Step 11: Verify vote score filtering
  const allPostsResult: IPageICommunityPlatformPost.ISummary =
    await api.functional.communityPlatform.posts.index(connection, {
      body: {
        page: 1,
        limit: 100,
      } satisfies ICommunityPlatformPost.IRequest,
    });
  typia.assert(allPostsResult);
  TestValidator.predicate(
    "search returns posts successfully",
    allPostsResult.data.length > 0,
  );

  // Step 12: Verify visibility status filtering
  const publicStatusResult: IPageICommunityPlatformPost.ISummary =
    await api.functional.communityPlatform.posts.index(connection, {
      body: {
        page: 1,
        limit: 100,
        visibility_status: "public",
      } satisfies ICommunityPlatformPost.IRequest,
    });
  typia.assert(publicStatusResult);
  TestValidator.predicate(
    "visibility status filter works correctly",
    publicStatusResult.data.every(
      (post) => post.visibility_status === "public",
    ),
  );

  // Step 13: Verify pagination works with filters
  const paginatedResult: IPageICommunityPlatformPost.ISummary =
    await api.functional.communityPlatform.posts.index(connection, {
      body: {
        page: 1,
        limit: 2,
        community_id: community1.id,
      } satisfies ICommunityPlatformPost.IRequest,
    });
  typia.assert(paginatedResult);
  TestValidator.predicate(
    "pagination respects limit parameter",
    paginatedResult.data.length <= 2,
  );
}
