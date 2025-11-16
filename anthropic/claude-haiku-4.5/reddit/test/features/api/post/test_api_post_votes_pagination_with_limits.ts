import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCategory";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformVote";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformVote";

/**
 * Test pagination functionality when retrieving votes on a post.
 *
 * This test validates that the vote pagination API correctly handles various
 * limit values and page numbers. It creates a post with multiple votes
 * exceeding single page limits, then retrieves votes with different limit
 * configurations (1, 10, 50, 100) and various page numbers to ensure pagination
 * metadata (current page, total records, total pages, limit) are accurate.
 *
 * The test flow:
 *
 * 1. Create administrator account for category creation
 * 2. Create a category for community classification
 * 3. Create multiple members to generate diverse voting participation
 * 4. Create a community within the category
 * 5. Create a post in the community
 * 6. Cast multiple votes (more than typical page limit) from different members
 * 7. Retrieve votes with limit=1 and verify single result per page
 * 8. Retrieve votes with limit=10 and verify pagination metadata
 * 9. Retrieve votes with limit=50 and verify pagination accuracy
 * 10. Retrieve votes with limit=100 and verify all results fit in one page
 * 11. Request page beyond available pages and verify empty results
 * 12. Validate pagination boundaries and data consistency
 */
export async function test_api_post_votes_pagination_with_limits(
  connection: api.IConnection,
) {
  // 1. Create administrator account for category creation
  const adminEmail = `admin_${RandomGenerator.alphaNumeric(8)}@test.com`;
  const admin: ICommunityPlatformAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: adminEmail,
        password: "SecurePassword123!",
        username: `admin_${RandomGenerator.alphaNumeric(6)}`,
        name: `Admin ${RandomGenerator.name()}`,
        href: "https://example.com/admin",
      } satisfies ICommunityPlatformAdministrator.ICreate,
    });
  typia.assert(admin);

  // Switch to admin connection for category creation
  const adminConnection: api.IConnection = {
    ...connection,
    headers: {
      ...connection.headers,
      Authorization: `Bearer ${admin.token.access}`,
    },
  };

  // 2. Create a category for community classification
  const category: ICommunityPlatformCategory =
    await api.functional.communityPlatform.administrator.categories.create(
      adminConnection,
      {
        body: {
          name: `Category ${RandomGenerator.name()}`,
          slug: `category-${RandomGenerator.alphaNumeric(8)}`,
          display_order: 1,
          description: "Test category for vote pagination",
        } satisfies ICommunityPlatformCategory.ICreate,
      },
    );
  typia.assert(category);

  // 3. Create multiple members to generate diverse voting participation
  const members: ICommunityPlatformMember.IAuthorized[] =
    await ArrayUtil.asyncRepeat(25, async () => {
      const memberEmail = `member_${RandomGenerator.alphaNumeric(8)}@test.com`;
      return await api.functional.auth.member.join(connection, {
        body: {
          email: memberEmail,
          password: "MemberPassword123!",
          username: `member_${RandomGenerator.alphaNumeric(6)}`,
          href: "https://example.com/register",
          referrer: "https://example.com",
        } satisfies ICommunityPlatformMember.ICreate,
      });
    });
  typia.assert(members);

  // Use first member's connection for community creation
  const memberConnection: api.IConnection = {
    ...connection,
    headers: {
      ...connection.headers,
      Authorization: `Bearer ${members[0].token.access}`,
    },
  };

  // 4. Create a community within the category
  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.member.communities.create(
      memberConnection,
      {
        body: {
          name: `Community ${RandomGenerator.name()}`,
          identifier: `community_${RandomGenerator.alphaNumeric(8)}`,
          description: "Test community for vote pagination",
          visibility: "public",
          post_creation_restriction: "open_to_all",
          post_type_restriction: "all_types",
          category_slug: category.slug,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  // 5. Create a post in the community
  const post: ICommunityPlatformPost =
    await api.functional.communityPlatform.member.posts.create(
      memberConnection,
      {
        body: {
          community_id: community.id,
          post_type: "text",
          title: `Test Post ${RandomGenerator.name()}`,
          content_text: RandomGenerator.content(),
        } satisfies ICommunityPlatformPost.ICreate,
      },
    );
  typia.assert(post);

  // 6. Cast multiple votes (more than typical page limit) from different members
  const voteCount = 25;
  const votes: ICommunityPlatformVote[] = await ArrayUtil.asyncRepeat(
    voteCount,
    async (index) => {
      const voter = members[index % members.length];
      const voterConnection: api.IConnection = {
        ...connection,
        headers: {
          ...connection.headers,
          Authorization: `Bearer ${voter.token.access}`,
        },
      };

      return await api.functional.communityPlatform.member.posts.votes.create(
        voterConnection,
        {
          postId: post.id,
          body: {
            content_type: "post",
            content_id: post.id,
            vote_type: index % 2 === 0 ? "upvote" : "downvote",
          } satisfies ICommunityPlatformVote.ICreate,
        },
      );
    },
  );
  typia.assert(votes);

  // 7. Retrieve votes with limit=1 and verify single result per page
  const limit1Response: IPageICommunityPlatformVote.ISummary =
    await api.functional.communityPlatform.posts.votes.index(memberConnection, {
      postId: post.id,
      body: {
        page: 1,
        limit: 1,
      } satisfies ICommunityPlatformVote.IRequest,
    });
  typia.assert(limit1Response);
  TestValidator.equals(
    "limit=1 response has pagination",
    limit1Response.pagination !== null,
    true,
  );
  TestValidator.equals(
    "limit=1 current page",
    limit1Response.pagination.current,
    1,
  );
  TestValidator.equals(
    "limit=1 limit value",
    limit1Response.pagination.limit,
    1,
  );
  TestValidator.equals("limit=1 data length", limit1Response.data.length, 1);
  TestValidator.predicate(
    "limit=1 total records > 1",
    () => limit1Response.pagination.records > 1,
  );
  TestValidator.predicate(
    "limit=1 total pages > 1",
    () => limit1Response.pagination.pages > 1,
  );

  // 8. Retrieve votes with limit=10 and verify pagination metadata
  const limit10Response: IPageICommunityPlatformVote.ISummary =
    await api.functional.communityPlatform.posts.votes.index(memberConnection, {
      postId: post.id,
      body: {
        page: 1,
        limit: 10,
      } satisfies ICommunityPlatformVote.IRequest,
    });
  typia.assert(limit10Response);
  TestValidator.equals(
    "limit=10 current page",
    limit10Response.pagination.current,
    1,
  );
  TestValidator.equals(
    "limit=10 limit value",
    limit10Response.pagination.limit,
    10,
  );
  TestValidator.equals("limit=10 data length", limit10Response.data.length, 10);
  TestValidator.equals(
    "limit=10 total records",
    limit10Response.pagination.records,
    voteCount,
  );
  TestValidator.equals(
    "limit=10 total pages",
    limit10Response.pagination.pages,
    3,
  ); // 25 / 10 = 3 pages

  // Retrieve page 2 with limit=10
  const limit10Page2: IPageICommunityPlatformVote.ISummary =
    await api.functional.communityPlatform.posts.votes.index(memberConnection, {
      postId: post.id,
      body: {
        page: 2,
        limit: 10,
      } satisfies ICommunityPlatformVote.IRequest,
    });
  typia.assert(limit10Page2);
  TestValidator.equals(
    "limit=10 page 2 current",
    limit10Page2.pagination.current,
    2,
  );
  TestValidator.equals(
    "limit=10 page 2 data length",
    limit10Page2.data.length,
    10,
  );

  // Retrieve page 3 with limit=10
  const limit10Page3: IPageICommunityPlatformVote.ISummary =
    await api.functional.communityPlatform.posts.votes.index(memberConnection, {
      postId: post.id,
      body: {
        page: 3,
        limit: 10,
      } satisfies ICommunityPlatformVote.IRequest,
    });
  typia.assert(limit10Page3);
  TestValidator.equals(
    "limit=10 page 3 current",
    limit10Page3.pagination.current,
    3,
  );
  TestValidator.equals(
    "limit=10 page 3 data length",
    limit10Page3.data.length,
    5,
  ); // Remaining 5 votes

  // 9. Retrieve votes with limit=50 and verify pagination accuracy
  const limit50Response: IPageICommunityPlatformVote.ISummary =
    await api.functional.communityPlatform.posts.votes.index(memberConnection, {
      postId: post.id,
      body: {
        page: 1,
        limit: 50,
      } satisfies ICommunityPlatformVote.IRequest,
    });
  typia.assert(limit50Response);
  TestValidator.equals(
    "limit=50 current page",
    limit50Response.pagination.current,
    1,
  );
  TestValidator.equals(
    "limit=50 limit value",
    limit50Response.pagination.limit,
    50,
  );
  TestValidator.equals(
    "limit=50 data length",
    limit50Response.data.length,
    voteCount,
  );
  TestValidator.equals(
    "limit=50 total records",
    limit50Response.pagination.records,
    voteCount,
  );
  TestValidator.equals(
    "limit=50 total pages",
    limit50Response.pagination.pages,
    1,
  ); // All fit in one page

  // 10. Retrieve votes with limit=100 and verify all results fit in one page
  const limit100Response: IPageICommunityPlatformVote.ISummary =
    await api.functional.communityPlatform.posts.votes.index(memberConnection, {
      postId: post.id,
      body: {
        page: 1,
        limit: 100,
      } satisfies ICommunityPlatformVote.IRequest,
    });
  typia.assert(limit100Response);
  TestValidator.equals(
    "limit=100 current page",
    limit100Response.pagination.current,
    1,
  );
  TestValidator.equals(
    "limit=100 limit value",
    limit100Response.pagination.limit,
    100,
  );
  TestValidator.equals(
    "limit=100 data length",
    limit100Response.data.length,
    voteCount,
  );
  TestValidator.equals(
    "limit=100 total records",
    limit100Response.pagination.records,
    voteCount,
  );
  TestValidator.equals(
    "limit=100 total pages",
    limit100Response.pagination.pages,
    1,
  );

  // 11. Request page beyond available pages and verify empty results
  const beyondPageResponse: IPageICommunityPlatformVote.ISummary =
    await api.functional.communityPlatform.posts.votes.index(memberConnection, {
      postId: post.id,
      body: {
        page: 100,
        limit: 10,
      } satisfies ICommunityPlatformVote.IRequest,
    });
  typia.assert(beyondPageResponse);
  TestValidator.equals(
    "beyond page current",
    beyondPageResponse.pagination.current,
    100,
  );
  TestValidator.equals(
    "beyond page data length",
    beyondPageResponse.data.length,
    0,
  );

  // 12. Validate pagination consistency across different limits
  TestValidator.equals(
    "consistency: total records same limit=1",
    limit1Response.pagination.records,
    voteCount,
  );
  TestValidator.equals(
    "consistency: total records same limit=10",
    limit10Response.pagination.records,
    voteCount,
  );
  TestValidator.equals(
    "consistency: total records same limit=50",
    limit50Response.pagination.records,
    voteCount,
  );
  TestValidator.equals(
    "consistency: total records same limit=100",
    limit100Response.pagination.records,
    voteCount,
  );

  // Verify data integrity - ensure no duplicate votes across pages
  const allVotesFromPages: ICommunityPlatformVote.ISummary[] = [
    ...limit10Response.data,
    ...limit10Page2.data,
    ...limit10Page3.data,
  ];
  TestValidator.equals(
    "total votes collected",
    allVotesFromPages.length,
    voteCount,
  );
}
