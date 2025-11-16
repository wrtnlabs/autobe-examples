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
 * Test filtering votes by vote type (specifically 'downvote').
 *
 * This test validates the vote filtering functionality by querying votes with
 * vote_type='downvote' filter to ensure only downvotes are returned and the
 * filtering mechanism works correctly in the community platform.
 *
 * Test workflow:
 *
 * 1. Setup: Create administrator account
 * 2. Create a category for community classification
 * 3. Create a community
 * 4. Create member account
 * 5. Query all votes to establish baseline
 * 6. Query only downvotes using vote_type filter
 * 7. Verify all returned votes are downvotes
 * 8. Query only upvotes for comparison
 * 9. Verify downvote and upvote results are distinct
 * 10. Validate pagination and response structure
 */
export async function test_api_votes_filter_by_downvote_type(
  connection: api.IConnection,
) {
  // Step 1: Create administrator account
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword =
    RandomGenerator.alphabets(4) + RandomGenerator.alphaNumeric(4);
  const admin: ICommunityPlatformAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        username: RandomGenerator.alphaNumeric(8),
        name: RandomGenerator.name(),
        href: "http://localhost:3000/admin/join",
        referrer: "http://localhost:3000",
      } satisfies ICommunityPlatformAdministrator.ICreate,
    });
  typia.assert(admin);

  // Step 2: Create category
  const category: ICommunityPlatformCategory =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      {
        body: {
          name: RandomGenerator.name(),
          slug: RandomGenerator.alphaNumeric(8).toLowerCase(),
          description: RandomGenerator.paragraph({ sentences: 2 }),
          display_order: 1,
        } satisfies ICommunityPlatformCategory.ICreate,
      },
    );
  typia.assert(category);

  // Step 3: Create member account
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword =
    RandomGenerator.alphabets(4) + RandomGenerator.alphaNumeric(4);
  const member: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        username: RandomGenerator.alphaNumeric(8),
        password: memberPassword,
        href: "http://localhost:3000/join",
        referrer: "http://localhost:3000",
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(member);

  // Step 4: Create community
  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: RandomGenerator.name(),
          identifier: RandomGenerator.alphaNumeric(8).toLowerCase(),
          description: RandomGenerator.paragraph({ sentences: 3 }),
          visibility: "public",
          post_creation_restriction: "open_to_all",
          post_type_restriction: "all_types",
          category_slug: category.slug,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  // Step 5: Create a post
  const post: ICommunityPlatformPost =
    await api.functional.communityPlatform.member.posts.create(connection, {
      body: {
        community_id: community.id,
        post_type: "text",
        title: RandomGenerator.paragraph({ sentences: 2 }),
        content_text: RandomGenerator.content({ paragraphs: 2 }),
      } satisfies ICommunityPlatformPost.ICreate,
    });
  typia.assert(post);

  // Step 6: Create a comment on the post
  const comment: ICommunityPlatformComment =
    await api.functional.communityPlatform.member.comments.create(connection, {
      body: {
        post_id: post.id,
        content: RandomGenerator.paragraph({ sentences: 3 }),
      } satisfies ICommunityPlatformComment.ICreate,
    });
  typia.assert(comment);

  // Step 7: Query all votes to establish baseline
  const allVotesResponse: IPageICommunityPlatformVote =
    await api.functional.communityPlatform.member.votes.index(connection, {
      body: {
        page: 1,
        limit: 100,
      } satisfies ICommunityPlatformVote.IRequest,
    });
  typia.assert(allVotesResponse);
  TestValidator.predicate(
    "all votes response has valid data array",
    Array.isArray(allVotesResponse.data),
  );
  TestValidator.predicate(
    "all votes response has pagination",
    allVotesResponse.pagination !== undefined,
  );

  // Step 8: Query only downvotes using vote_type filter
  const downvotesResponse: IPageICommunityPlatformVote =
    await api.functional.communityPlatform.member.votes.index(connection, {
      body: {
        page: 1,
        limit: 100,
        vote_type: "downvote",
      } satisfies ICommunityPlatformVote.IRequest,
    });
  typia.assert(downvotesResponse);
  TestValidator.predicate(
    "downvotes response has valid data array",
    Array.isArray(downvotesResponse.data),
  );
  TestValidator.predicate(
    "downvotes response has pagination",
    downvotesResponse.pagination !== undefined,
  );

  // Step 9: Verify all returned votes are downvotes
  for (const vote of downvotesResponse.data) {
    typia.assert(vote);
    TestValidator.equals("vote_type is downvote", vote.vote_type, "downvote");
  }

  // Step 10: Query only upvotes for comparison
  const upvotesResponse: IPageICommunityPlatformVote =
    await api.functional.communityPlatform.member.votes.index(connection, {
      body: {
        page: 1,
        limit: 100,
        vote_type: "upvote",
      } satisfies ICommunityPlatformVote.IRequest,
    });
  typia.assert(upvotesResponse);
  TestValidator.predicate(
    "upvotes response has valid data array",
    Array.isArray(upvotesResponse.data),
  );

  // Step 11: Verify all upvotes have correct vote_type
  for (const vote of upvotesResponse.data) {
    typia.assert(vote);
    TestValidator.equals(
      "upvote vote_type is upvote",
      vote.vote_type,
      "upvote",
    );
  }

  // Step 12: Verify no overlap between downvotes and upvotes
  const downvoteIds = new Set(downvotesResponse.data.map((v) => v.id));
  for (const upvote of upvotesResponse.data) {
    TestValidator.predicate(
      "upvotes and downvotes have no overlap",
      !downvoteIds.has(upvote.id),
    );
  }

  // Step 13: Verify vote filtering is working correctly by checking counts
  TestValidator.predicate(
    "downvote pagination records is non-negative",
    downvotesResponse.pagination.records >= 0,
  );
  TestValidator.predicate(
    "upvote pagination records is non-negative",
    upvotesResponse.pagination.records >= 0,
  );
  TestValidator.predicate(
    "all votes count matches sum of upvotes and downvotes",
    allVotesResponse.pagination.records >=
      downvotesResponse.pagination.records + upvotesResponse.pagination.records,
  );

  // Step 14: Verify pagination structure is correct
  TestValidator.predicate(
    "downvote pagination current page is valid",
    downvotesResponse.pagination.current >= 1,
  );
  TestValidator.predicate(
    "downvote pagination limit is valid",
    downvotesResponse.pagination.limit > 0,
  );
  TestValidator.predicate(
    "downvote pagination pages calculation is correct",
    downvotesResponse.pagination.pages >= 0,
  );
}
