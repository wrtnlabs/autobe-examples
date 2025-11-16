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
 * Test filtering votes by specific content ID (post or comment).
 *
 * This test validates that the votes filtering API correctly filters votes by
 * specific content IDs (both posts and comments). Since vote creation is
 * handled by the backend, this test focuses on verifying that the vote search
 * endpoint correctly filters and returns votes based on content_id and
 * content_type parameters.
 *
 * Test workflow:
 *
 * 1. Setup: Create administrator and category
 * 2. Create member user
 * 3. Create community and posts
 * 4. Query votes with various content_id and content_type filter combinations
 * 5. Verify filtering works correctly for posts
 * 6. Verify filtering works correctly for comments
 * 7. Verify combined content_type and content_id filtering
 * 8. Verify pagination with content_id filters
 */
export async function test_api_votes_filter_by_specific_content_id(
  connection: api.IConnection,
) {
  // Step 1: Create administrator and category
  const admin: ICommunityPlatformAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(12),
        username: RandomGenerator.alphaNumeric(8),
        name: RandomGenerator.name(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ICommunityPlatformAdministrator.ICreate,
    });
  typia.assert(admin);

  const category: ICommunityPlatformCategory =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      {
        body: {
          name: RandomGenerator.name(2),
          slug: RandomGenerator.alphaNumeric(8),
          display_order: 1,
        } satisfies ICommunityPlatformCategory.ICreate,
      },
    );
  typia.assert(category);

  // Step 2: Create member user
  const member: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        username: RandomGenerator.alphaNumeric(10),
        password: RandomGenerator.alphaNumeric(12),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(member);

  // Step 3: Create community
  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: RandomGenerator.name(2),
          identifier: RandomGenerator.alphaNumeric(8),
          visibility: "public",
          post_creation_restriction: "open_to_all",
          post_type_restriction: "all_types",
          category_slug: category.slug,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  // Step 4: Create multiple posts for vote filtering tests
  const post1: ICommunityPlatformPost =
    await api.functional.communityPlatform.member.posts.create(connection, {
      body: {
        community_id: community.id,
        post_type: "text",
        title: RandomGenerator.paragraph({ sentences: 3 }),
        content_text: RandomGenerator.content({ paragraphs: 2 }),
      } satisfies ICommunityPlatformPost.ICreate,
    });
  typia.assert(post1);

  const post2: ICommunityPlatformPost =
    await api.functional.communityPlatform.member.posts.create(connection, {
      body: {
        community_id: community.id,
        post_type: "text",
        title: RandomGenerator.paragraph({ sentences: 3 }),
        content_text: RandomGenerator.content({ paragraphs: 2 }),
      } satisfies ICommunityPlatformPost.ICreate,
    });
  typia.assert(post2);

  // Step 5: Create comments for vote filtering tests
  const comment1: ICommunityPlatformComment =
    await api.functional.communityPlatform.member.comments.create(connection, {
      body: {
        post_id: post1.id,
        content: RandomGenerator.paragraph({ sentences: 5 }),
      } satisfies ICommunityPlatformComment.ICreate,
    });
  typia.assert(comment1);

  const comment2: ICommunityPlatformComment =
    await api.functional.communityPlatform.member.comments.create(connection, {
      body: {
        post_id: post2.id,
        content: RandomGenerator.paragraph({ sentences: 5 }),
      } satisfies ICommunityPlatformComment.ICreate,
    });
  typia.assert(comment2);

  // Step 6: Filter votes by specific post ID (post1)
  const post1Votes: IPageICommunityPlatformVote =
    await api.functional.communityPlatform.member.votes.index(connection, {
      body: {
        content_type: "post",
        content_id: post1.id,
        limit: 100,
        page: 1,
      } satisfies ICommunityPlatformVote.IRequest,
    });
  typia.assert(post1Votes);

  // Verify pagination structure
  TestValidator.predicate(
    "post1 votes pagination should have valid structure",
    post1Votes.pagination !== undefined &&
      post1Votes.pagination.current >= 0 &&
      post1Votes.pagination.limit > 0 &&
      post1Votes.pagination.records >= 0 &&
      post1Votes.pagination.pages >= 0,
  );

  // Verify all returned votes match post1.id filter
  for (const vote of post1Votes.data) {
    TestValidator.equals(
      "vote content_id should match post1.id",
      vote.content_id,
      post1.id,
    );
    TestValidator.equals(
      "vote content_type should be post",
      vote.content_type,
      "post",
    );
  }

  // Step 7: Filter votes by specific post ID (post2)
  const post2Votes: IPageICommunityPlatformVote =
    await api.functional.communityPlatform.member.votes.index(connection, {
      body: {
        content_type: "post",
        content_id: post2.id,
        limit: 100,
        page: 1,
      } satisfies ICommunityPlatformVote.IRequest,
    });
  typia.assert(post2Votes);

  // Verify all returned votes match post2.id filter
  for (const vote of post2Votes.data) {
    TestValidator.equals(
      "vote content_id should match post2.id",
      vote.content_id,
      post2.id,
    );
    TestValidator.equals(
      "vote content_type should be post",
      vote.content_type,
      "post",
    );
  }

  // Step 8: Filter votes by specific comment ID (comment1)
  const comment1Votes: IPageICommunityPlatformVote =
    await api.functional.communityPlatform.member.votes.index(connection, {
      body: {
        content_type: "comment",
        content_id: comment1.id,
        limit: 100,
        page: 1,
      } satisfies ICommunityPlatformVote.IRequest,
    });
  typia.assert(comment1Votes);

  // Verify all returned votes match comment1.id filter
  for (const vote of comment1Votes.data) {
    TestValidator.equals(
      "vote content_id should match comment1.id",
      vote.content_id,
      comment1.id,
    );
    TestValidator.equals(
      "vote content_type should be comment",
      vote.content_type,
      "comment",
    );
  }

  // Step 9: Filter votes by specific comment ID (comment2)
  const comment2Votes: IPageICommunityPlatformVote =
    await api.functional.communityPlatform.member.votes.index(connection, {
      body: {
        content_type: "comment",
        content_id: comment2.id,
        limit: 100,
        page: 1,
      } satisfies ICommunityPlatformVote.IRequest,
    });
  typia.assert(comment2Votes);

  // Verify all returned votes match comment2.id filter
  for (const vote of comment2Votes.data) {
    TestValidator.equals(
      "vote content_id should match comment2.id",
      vote.content_id,
      comment2.id,
    );
    TestValidator.equals(
      "vote content_type should be comment",
      vote.content_type,
      "comment",
    );
  }

  // Step 10: Test filtering with content_type alone (posts)
  const allPostVotes: IPageICommunityPlatformVote =
    await api.functional.communityPlatform.member.votes.index(connection, {
      body: {
        content_type: "post",
        limit: 100,
        page: 1,
      } satisfies ICommunityPlatformVote.IRequest,
    });
  typia.assert(allPostVotes);

  // Verify all returned votes are of post type
  for (const vote of allPostVotes.data) {
    TestValidator.equals(
      "all filtered votes should have content_type post",
      vote.content_type,
      "post",
    );
  }

  // Step 11: Test filtering with content_type alone (comments)
  const allCommentVotes: IPageICommunityPlatformVote =
    await api.functional.communityPlatform.member.votes.index(connection, {
      body: {
        content_type: "comment",
        limit: 100,
        page: 1,
      } satisfies ICommunityPlatformVote.IRequest,
    });
  typia.assert(allCommentVotes);

  // Verify all returned votes are of comment type
  for (const vote of allCommentVotes.data) {
    TestValidator.equals(
      "all filtered votes should have content_type comment",
      vote.content_type,
      "comment",
    );
  }

  // Step 12: Test pagination with content_id filter
  const paginatedVotes: IPageICommunityPlatformVote =
    await api.functional.communityPlatform.member.votes.index(connection, {
      body: {
        content_type: "post",
        content_id: post1.id,
        limit: 10,
        page: 1,
      } satisfies ICommunityPlatformVote.IRequest,
    });
  typia.assert(paginatedVotes);

  // Verify pagination metadata
  TestValidator.predicate(
    "current page should be 1",
    paginatedVotes.pagination.current === 1,
  );
  TestValidator.predicate(
    "limit should be 10",
    paginatedVotes.pagination.limit === 10,
  );
  TestValidator.predicate(
    "pages should match records divided by limit",
    paginatedVotes.pagination.pages ===
      Math.ceil(
        paginatedVotes.pagination.records / paginatedVotes.pagination.limit,
      ) || paginatedVotes.pagination.records === 0,
  );
}
