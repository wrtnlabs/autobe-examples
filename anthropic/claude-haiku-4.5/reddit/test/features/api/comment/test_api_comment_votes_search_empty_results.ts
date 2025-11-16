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
import type { ICommunityPlatformVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformVote";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformVote";

/**
 * Test that vote search operations handle empty result sets gracefully.
 *
 * Creates the complete infrastructure (category, community, post, comment) but
 * deliberately does not cast any votes. Queries for votes on the comment and
 * verifies the API returns a properly formatted paginated response with empty
 * data array and correct pagination metadata (total records = 0, pages = 0).
 *
 * Validation steps:
 *
 * 1. Create member account for authentication
 * 2. Create administrator account for category management
 * 3. Create category for community classification
 * 4. Create community for post hosting
 * 5. Create post as parent for comment
 * 6. Create comment without any votes
 * 7. Query votes with default parameters - verify empty results
 * 8. Query votes with pagination parameters - verify empty results maintained
 * 9. Verify pagination metadata is correct (total: 0, pages: 0)
 * 10. Verify data array is empty
 * 11. Verify no errors occur during empty result operations
 */
export async function test_api_comment_votes_search_empty_results(
  connection: api.IConnection,
) {
  // Step 1: Create authenticated member account
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = "TestPassword123!";
  const member = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      username: RandomGenerator.alphabets(10),
      password: memberPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(member);

  // Step 2: Create administrator account for category creation
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "AdminPassword123!";
  const administrator = await api.functional.auth.administrator.join(
    connection,
    {
      body: {
        email: adminEmail,
        password: adminPassword,
        username: RandomGenerator.alphabets(10),
        name: RandomGenerator.name(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ICommunityPlatformAdministrator.ICreate,
    },
  );
  typia.assert(administrator);

  // Step 3: Create category for community
  const category =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      {
        body: {
          name: RandomGenerator.name(),
          slug: RandomGenerator.alphabets(10),
          display_order: 1,
          description: RandomGenerator.paragraph(),
        } satisfies ICommunityPlatformCategory.ICreate,
      },
    );
  typia.assert(category);

  // Step 4: Create community
  const community =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: RandomGenerator.name(),
          identifier: RandomGenerator.alphabets(10),
          description: RandomGenerator.paragraph(),
          visibility: "public" as const,
          post_creation_restriction: "open_to_all" as const,
          post_type_restriction: "all_types" as const,
          category_slug: category.slug,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  // Step 5: Create post in the community
  const post = await api.functional.communityPlatform.member.posts.create(
    connection,
    {
      body: {
        community_id: community.id,
        post_type: "text" as const,
        title: RandomGenerator.paragraph({ sentences: 3 }),
        content_text: RandomGenerator.content({ paragraphs: 2 }),
      } satisfies ICommunityPlatformPost.ICreate,
    },
  );
  typia.assert(post);

  // Step 6: Create comment on the post (without any votes)
  const comment = await api.functional.communityPlatform.member.comments.create(
    connection,
    {
      body: {
        post_id: post.id,
        content: RandomGenerator.content({ paragraphs: 1 }),
      } satisfies ICommunityPlatformComment.ICreate,
    },
  );
  typia.assert(comment);

  // Step 7: Query votes with default parameters - verify empty results
  const defaultSearch =
    await api.functional.communityPlatform.member.comments.votes.index(
      connection,
      {
        commentId: comment.id,
        body: {} satisfies ICommunityPlatformVote.IRequest,
      },
    );
  typia.assert(defaultSearch);
  TestValidator.equals(
    "default search returns empty data array",
    defaultSearch.data.length,
    0,
  );
  TestValidator.equals(
    "default search total records is zero",
    defaultSearch.pagination.records,
    0,
  );
  TestValidator.equals(
    "default search pages is zero",
    defaultSearch.pagination.pages,
    0,
  );
  TestValidator.equals(
    "default search current page is zero",
    defaultSearch.pagination.current,
    0,
  );

  // Step 8: Query votes with pagination parameters - verify empty results maintained
  const paginatedSearch =
    await api.functional.communityPlatform.member.comments.votes.index(
      connection,
      {
        commentId: comment.id,
        body: {
          page: 1,
          limit: 20,
        } satisfies ICommunityPlatformVote.IRequest,
      },
    );
  typia.assert(paginatedSearch);
  TestValidator.equals(
    "paginated search returns empty data array",
    paginatedSearch.data.length,
    0,
  );
  TestValidator.equals(
    "paginated search total records is zero",
    paginatedSearch.pagination.records,
    0,
  );
  TestValidator.equals(
    "paginated search pages is zero",
    paginatedSearch.pagination.pages,
    0,
  );

  // Step 9: Query with vote type filter - verify empty results
  const typeFilteredSearch =
    await api.functional.communityPlatform.member.comments.votes.index(
      connection,
      {
        commentId: comment.id,
        body: {
          vote_type: "upvote" as const,
          limit: 10,
        } satisfies ICommunityPlatformVote.IRequest,
      },
    );
  typia.assert(typeFilteredSearch);
  TestValidator.equals(
    "type filtered search returns empty data",
    typeFilteredSearch.data.length,
    0,
  );
  TestValidator.equals(
    "type filtered search total is zero",
    typeFilteredSearch.pagination.records,
    0,
  );

  // Step 10: Query with member filter - verify empty results
  const memberFilteredSearch =
    await api.functional.communityPlatform.member.comments.votes.index(
      connection,
      {
        commentId: comment.id,
        body: {
          member_id: member.id,
          limit: 15,
        } satisfies ICommunityPlatformVote.IRequest,
      },
    );
  typia.assert(memberFilteredSearch);
  TestValidator.equals(
    "member filtered search returns empty data",
    memberFilteredSearch.data.length,
    0,
  );
  TestValidator.equals(
    "member filtered search total is zero",
    memberFilteredSearch.pagination.records,
    0,
  );

  // Step 11: Verify pagination metadata consistency across empty results
  TestValidator.predicate("default pagination has valid structure", () => {
    return (
      typeof defaultSearch.pagination.current === "number" &&
      typeof defaultSearch.pagination.limit === "number" &&
      typeof defaultSearch.pagination.records === "number" &&
      typeof defaultSearch.pagination.pages === "number" &&
      defaultSearch.pagination.current >= 0 &&
      defaultSearch.pagination.limit >= 0 &&
      defaultSearch.pagination.records === 0 &&
      defaultSearch.pagination.pages === 0
    );
  });
}
