import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityCategory";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformMember";

/**
 * Test moderator member search with pagination controls
 *
 * This E2E test validates the moderator member search functionality with
 * comprehensive pagination testing. It creates multiple member accounts and
 * communities to establish a realistic dataset, then performs various paginated
 * searches to verify that pagination metadata is correctly calculated including
 * current page, total records, and page limits. The test ensures that large
 * result sets are properly segmented and navigable through the pagination
 * interface.
 */
export async function test_api_moderator_member_search_pagination(
  connection: api.IConnection,
) {
  // Create moderator account for authentication
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      email: moderatorEmail,
      display_name: RandomGenerator.paragraph({ sentences: 2 }),
      moderator_level: "community",
      is_active: true,
    } satisfies ICommunityPlatformModerator.ICreate,
  });
  typia.assert(moderator);

  // Create multiple member accounts for testing
  const memberCount = 15;
  const createdMembers: ICommunityPlatformMember.IAuthorized[] = [];

  for (let i = 0; i < memberCount; i++) {
    const memberEmail = typia.random<string & tags.Format<"email">>();
    const member = await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        password: "password123",
        display_name: RandomGenerator.paragraph({ sentences: 2 }),
        href: "https://example.com/register",
        referrer: "https://example.com",
      } satisfies ICommunityPlatformMember.ICreate,
    });
    typia.assert(member);
    createdMembers.push(member);

    // Create community for some members to establish relationships
    if (i % 3 === 0) {
      await api.functional.communityPlatform.member.communities.create(
        connection,
        {
          body: {
            name: RandomGenerator.paragraph({ sentences: 2 }),
            slug: RandomGenerator.alphabets(10),
            description: RandomGenerator.content({ paragraphs: 1 }),
            privacy: "public",
          } satisfies ICommunityPlatformCommunity.ICreate,
        },
      );
    }
  }

  // Test pagination with different page sizes
  const pageSizes = [5, 10, 15] as const;

  for (const pageSize of pageSizes) {
    // Test first page
    const firstPage =
      await api.functional.communityPlatform.moderator.members.index(
        connection,
        {
          body: {
            page: 1,
            limit: pageSize,
            order_by: "created_at",
            order_direction: "desc",
          } satisfies ICommunityPlatformMember.IRequest,
        },
      );
    typia.assert(firstPage);

    TestValidator.equals(
      `page ${pageSize} should have correct pagination metadata`,
      firstPage.pagination.limit,
      pageSize,
    );
    TestValidator.equals(
      `page ${pageSize} should start at page 1`,
      firstPage.pagination.current,
      0,
    );
    TestValidator.predicate(
      `page ${pageSize} should have reasonable total records`,
      firstPage.pagination.records >= memberCount,
    );
    TestValidator.predicate(
      `page ${pageSize} should have calculated pages correctly`,
      firstPage.pagination.pages ===
        Math.ceil(firstPage.pagination.records / pageSize),
    );

    // Test data length matches page size or total records if less
    const expectedDataLength = Math.min(pageSize, firstPage.pagination.records);
    TestValidator.equals(
      `page ${pageSize} should return correct number of members`,
      firstPage.data.length,
      expectedDataLength,
    );

    // Test subsequent pages if they exist
    if (firstPage.pagination.pages > 1) {
      const secondPage =
        await api.functional.communityPlatform.moderator.members.index(
          connection,
          {
            body: {
              page: 2,
              limit: pageSize,
              order_by: "created_at",
              order_direction: "desc",
            } satisfies ICommunityPlatformMember.IRequest,
          },
        );
      typia.assert(secondPage);

      TestValidator.equals(
        `second page ${pageSize} should be page 2`,
        secondPage.pagination.current,
        1,
      );
      TestValidator.equals(
        `second page ${pageSize} should maintain same limit`,
        secondPage.pagination.limit,
        pageSize,
      );

      // Verify different data between pages
      if (firstPage.data.length > 0 && secondPage.data.length > 0) {
        TestValidator.notEquals(
          `pages ${pageSize} should have different member IDs`,
          firstPage.data[0]?.id,
          secondPage.data[0]?.id,
        );
      }
    }
  }

  // Test search functionality with pagination
  if (createdMembers.length > 0) {
    const firstMember = createdMembers[0];
    if (firstMember) {
      const searchTerm = firstMember.email.substring(0, 5);
      const searchResults =
        await api.functional.communityPlatform.moderator.members.index(
          connection,
          {
            body: {
              search: searchTerm,
              page: 1,
              limit: 10,
            } satisfies ICommunityPlatformMember.IRequest,
          },
        );
      typia.assert(searchResults);

      TestValidator.predicate(
        "search should return matching members",
        searchResults.data.length > 0,
      );

      // Verify search results contain the search term
      TestValidator.predicate(
        "search results should match search criteria",
        searchResults.data.some(
          (member) =>
            member.email.includes(searchTerm) ||
            member.display_name.includes(searchTerm),
        ),
      );
    }
  }

  // Test edge cases: page beyond total pages
  const largePageRequest =
    await api.functional.communityPlatform.moderator.members.index(connection, {
      body: {
        page: 1000, // Very high page number
        limit: 10,
      } satisfies ICommunityPlatformMember.IRequest,
    });
  typia.assert(largePageRequest);

  TestValidator.predicate(
    "large page number should return valid pagination response",
    largePageRequest.pagination.current >= 0 &&
      largePageRequest.pagination.limit === 10,
  );
}
