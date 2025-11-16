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
 * Validate vote sorting by vote_type.
 *
 * This test verifies that the vote API correctly sorts votes by vote_type
 * (upvote vs downvote). It queries the votes API with sort_by='vote_type'
 * parameter and validates that results are properly sorted and grouped by vote
 * type in both ascending and descending order.
 *
 * Test flow:
 *
 * 1. Setup: Create administrator, category, member, and community
 * 2. Create posts and comments (content to be voted on)
 * 3. Query votes sorted by vote_type ascending (downvotes first)
 * 4. Verify results are sorted correctly by vote_type
 * 5. Query votes sorted by vote_type descending (upvotes first)
 * 6. Verify results are sorted in reverse order
 */
export async function test_api_votes_sort_by_vote_type(
  connection: api.IConnection,
) {
  // Setup: Create administrator account
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin: ICommunityPlatformAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: adminEmail,
        password: RandomGenerator.alphabets(12),
        username: RandomGenerator.alphabets(8),
        name: RandomGenerator.name(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ICommunityPlatformAdministrator.ICreate,
    });
  typia.assert(admin);

  // Create a category
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

  // Create member account
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        username: RandomGenerator.alphabets(8),
        password: RandomGenerator.alphabets(12),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(member);

  // Create community
  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: RandomGenerator.name(2),
          identifier: RandomGenerator.alphabets(8).toLowerCase(),
          visibility: "public",
          post_creation_restriction: "open_to_all",
          post_type_restriction: "all_types",
          category_slug: category.slug,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  // Create posts to generate voteable content
  const posts: ICommunityPlatformPost[] = await ArrayUtil.asyncRepeat(
    3,
    async () => {
      const post: ICommunityPlatformPost =
        await api.functional.communityPlatform.member.posts.create(connection, {
          body: {
            community_id: community.id,
            post_type: "text",
            title: RandomGenerator.name(2),
            content_text: RandomGenerator.paragraph({ sentences: 5 }),
          } satisfies ICommunityPlatformPost.ICreate,
        });
      return post;
    },
  );
  typia.assert(posts);

  // Create comments to generate voteable content
  const comments: ICommunityPlatformComment[] = await ArrayUtil.asyncRepeat(
    2,
    async () => {
      const comment: ICommunityPlatformComment =
        await api.functional.communityPlatform.member.comments.create(
          connection,
          {
            body: {
              post_id: posts[0].id,
              content: RandomGenerator.paragraph({ sentences: 3 }),
            } satisfies ICommunityPlatformComment.ICreate,
          },
        );
      return comment;
    },
  );
  typia.assert(comments);

  // Query votes sorted by vote_type ascending (downvotes first)
  const votesAscending: IPageICommunityPlatformVote =
    await api.functional.communityPlatform.member.votes.index(connection, {
      body: {
        page: 1,
        limit: 100,
        sort_by: "vote_type",
        order: "asc",
      } satisfies ICommunityPlatformVote.IRequest,
    });
  typia.assert(votesAscending);

  // Validate ascending sort: downvotes should appear before upvotes
  const ascendingVotes = votesAscending.data;
  let lastSeenType: "downvote" | "upvote" | null = null;
  let isProperlyOrdered = true;

  for (const vote of ascendingVotes) {
    if (lastSeenType === "upvote" && vote.vote_type === "downvote") {
      isProperlyOrdered = false;
      break;
    }
    lastSeenType = vote.vote_type;
  }

  TestValidator.predicate(
    "votes sorted ascending by vote_type should have downvotes before upvotes",
    isProperlyOrdered,
  );

  // Query votes sorted by vote_type descending (upvotes first)
  const votesDescending: IPageICommunityPlatformVote =
    await api.functional.communityPlatform.member.votes.index(connection, {
      body: {
        page: 1,
        limit: 100,
        sort_by: "vote_type",
        order: "desc",
      } satisfies ICommunityPlatformVote.IRequest,
    });
  typia.assert(votesDescending);

  // Validate descending sort: upvotes should appear before downvotes
  const descendingVotes = votesDescending.data;
  lastSeenType = null;
  isProperlyOrdered = true;

  for (const vote of descendingVotes) {
    if (lastSeenType === "downvote" && vote.vote_type === "upvote") {
      isProperlyOrdered = false;
      break;
    }
    lastSeenType = vote.vote_type;
  }

  TestValidator.predicate(
    "votes sorted descending by vote_type should have upvotes before downvotes",
    isProperlyOrdered,
  );

  // Verify pagination information is present
  TestValidator.predicate(
    "pagination should have valid current page",
    votesAscending.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination should have valid limit",
    votesAscending.pagination.limit > 0,
  );
}
