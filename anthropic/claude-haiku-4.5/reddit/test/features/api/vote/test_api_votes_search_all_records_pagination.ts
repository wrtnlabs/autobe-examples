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
 * Test searching and retrieving voting records with pagination.
 *
 * Queries the votes search endpoint with default pagination (page=1, limit=20)
 * and verifies the complete result set is returned with proper pagination
 * metadata.
 *
 * The test validates:
 *
 * - Current page number equals 1
 * - Limit per page equals 20 (default)
 * - Total records count is non-negative
 * - Total pages calculated correctly (ceiling of records / limit)
 * - All vote records have proper structure with member, vote_type, content_type,
 *   and timestamps
 * - Vote data respects the limit constraint
 */
export async function test_api_votes_search_all_records_pagination(
  connection: api.IConnection,
) {
  // 1. Create administrator account
  const administratorEmail = typia.random<string & tags.Format<"email">>();
  const administrator: ICommunityPlatformAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: administratorEmail,
        password: "Admin@Password123",
        username: RandomGenerator.alphaNumeric(8),
        name: RandomGenerator.name(),
        href: "https://community.example.com/admin/join",
        referrer: "https://community.example.com",
      } satisfies ICommunityPlatformAdministrator.ICreate,
    });
  typia.assert(administrator);

  // 2. Create member account
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        username: RandomGenerator.alphaNumeric(8),
        password: "Member@Password123",
        href: "https://community.example.com/join",
        referrer: "https://community.example.com",
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(member);

  // 3. Create category for community
  await api.functional.auth.administrator.login(connection, {
    body: {
      email: administratorEmail,
      password: "Admin@Password123",
      href: "https://community.example.com/admin/login",
      referrer: "https://community.example.com",
    } satisfies ICommunityPlatformAdministrator.ILogin,
  });

  const category: ICommunityPlatformCategory =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      {
        body: {
          name: "Technology",
          slug: `tech_${RandomGenerator.alphaNumeric(6)}`,
          description: "Technology discussions and news",
          display_order: 1,
        } satisfies ICommunityPlatformCategory.ICreate,
      },
    );
  typia.assert(category);

  // 4. Switch to member for community and content creation
  await api.functional.auth.member.login(connection, {
    body: {
      email: memberEmail,
      password: "Member@Password123",
      href: "https://community.example.com/login",
      referrer: "https://community.example.com",
    } satisfies ICommunityPlatformMember.ILogin,
  });

  // 5. Create community
  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: RandomGenerator.name(2),
          identifier: `tech_${RandomGenerator.alphaNumeric(6)}`,
          description: RandomGenerator.paragraph({ sentences: 3 }),
          visibility: "public",
          post_creation_restriction: "open_to_all",
          post_type_restriction: "all_types",
          category_slug: category.slug,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  // 6. Create multiple posts for the community
  const posts: ICommunityPlatformPost[] = await ArrayUtil.asyncRepeat(
    10,
    async () => {
      return await api.functional.communityPlatform.member.posts.create(
        connection,
        {
          body: {
            community_id: community.id,
            post_type: "text",
            title: RandomGenerator.paragraph({ sentences: 2 }),
            content_text: RandomGenerator.content({ paragraphs: 2 }),
            is_nsfw: false,
            has_spoiler: false,
          } satisfies ICommunityPlatformPost.ICreate,
        },
      );
    },
  );
  posts.forEach((post) => typia.assert(post));

  // 7. Create comments on posts
  const comments: ICommunityPlatformComment[] = await ArrayUtil.asyncRepeat(
    10,
    async (index) => {
      return await api.functional.communityPlatform.member.comments.create(
        connection,
        {
          body: {
            post_id: posts[index].id,
            content: RandomGenerator.paragraph({ sentences: 3 }),
          } satisfies ICommunityPlatformComment.ICreate,
        },
      );
    },
  );
  comments.forEach((comment) => typia.assert(comment));

  // 8. Search all votes with default pagination (page=1, limit=20)
  const allVotesResult: IPageICommunityPlatformVote =
    await api.functional.communityPlatform.member.votes.index(connection, {
      body: {
        page: 1,
        limit: 20,
      } satisfies ICommunityPlatformVote.IRequest,
    });
  typia.assert(allVotesResult);

  // 9. Validate pagination metadata structure
  TestValidator.equals(
    "pagination current page should be 1",
    allVotesResult.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit should be 20",
    allVotesResult.pagination.limit,
    20,
  );
  TestValidator.predicate(
    "pagination records should be non-negative",
    allVotesResult.pagination.records >= 0,
  );

  // 10. Validate total pages calculation
  const expectedPages = Math.ceil(
    allVotesResult.pagination.records / allVotesResult.pagination.limit,
  );
  TestValidator.equals(
    "pagination pages should be calculated correctly",
    allVotesResult.pagination.pages,
    expectedPages,
  );

  // 11. Validate votes array structure
  TestValidator.predicate(
    "votes data array should be present",
    Array.isArray(allVotesResult.data),
  );
  TestValidator.predicate(
    "votes should not exceed limit per page",
    allVotesResult.data.length <= 20,
  );

  // 12. Validate individual vote records structure
  allVotesResult.data.forEach((vote) => {
    typia.assert(vote);
    TestValidator.predicate(
      "vote should have valid id",
      vote.id && typeof vote.id === "string",
    );
    TestValidator.predicate("vote should have member", vote.member !== null);
    TestValidator.predicate(
      "vote type should be upvote or downvote",
      vote.vote_type === "upvote" || vote.vote_type === "downvote",
    );
    TestValidator.predicate(
      "content type should be post or comment",
      vote.content_type === "post" || vote.content_type === "comment",
    );
    TestValidator.predicate(
      "vote should have content_id",
      vote.content_id && typeof vote.content_id === "string",
    );
    TestValidator.predicate(
      "vote should have created_at timestamp",
      vote.created_at && typeof vote.created_at === "string",
    );
  });
}
