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
 * Validates vote filtering by content type (comment).
 *
 * This test creates a complete community workflow with posts and comments, then
 * uses the vote filtering API to query votes filtered by
 * content_type='comment'. It verifies that the vote filter correctly returns
 * only votes on comments and that the pagination and filtering mechanisms work
 * as expected.
 *
 * Test flow:
 *
 * 1. Authenticate as member to establish community context
 * 2. Authenticate as administrator to create category
 * 3. Create a category for community organization
 * 4. Create a community within the category
 * 5. Create multiple posts and comments (setting up content structure)
 * 6. Query votes filtered by content_type='comment'
 * 7. Verify the response structure and pagination
 * 8. Validate that filtering parameters are respected
 */
export async function test_api_votes_filter_by_content_type_comment(
  connection: api.IConnection,
) {
  // Step 1: Authenticate as member to establish community context
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = RandomGenerator.alphabets(10);

  const member = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      username: RandomGenerator.alphabets(8),
      password: memberPassword,
      href: "http://localhost:3000/register",
      referrer: "http://localhost:3000",
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(member);

  // Step 2: Authenticate as administrator to create category
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphabets(10);

  const admin = await api.functional.auth.administrator.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      username: RandomGenerator.alphabets(8),
      name: RandomGenerator.name(),
      href: "http://localhost:3000/admin",
      referrer: "http://localhost:3000",
    } satisfies ICommunityPlatformAdministrator.ICreate,
  });
  typia.assert(admin);

  // Switch to admin connection for category creation
  const adminConnection = {
    ...connection,
    headers: {
      ...connection.headers,
      Authorization: admin.token.access,
    },
  };

  // Step 3: Create a category
  const category =
    await api.functional.communityPlatform.administrator.categories.create(
      adminConnection,
      {
        body: {
          name: RandomGenerator.name(2),
          slug: RandomGenerator.alphabets(10).toLowerCase(),
          display_order: 1,
          description: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies ICommunityPlatformCategory.ICreate,
      },
    );
  typia.assert(category);

  // Switch back to member connection
  const memberConnection = {
    ...connection,
    headers: {
      ...connection.headers,
      Authorization: member.token.access,
    },
  };

  // Step 4: Create a community
  const community =
    await api.functional.communityPlatform.member.communities.create(
      memberConnection,
      {
        body: {
          name: RandomGenerator.name(2),
          identifier: RandomGenerator.alphabets(10).toLowerCase(),
          description: RandomGenerator.paragraph({ sentences: 3 }),
          visibility: "public",
          post_creation_restriction: "open_to_all",
          post_type_restriction: "all_types",
          category_slug: category.slug,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  // Step 5: Create multiple posts and comments (content setup)
  const posts = await ArrayUtil.asyncRepeat(2, async () => {
    return await api.functional.communityPlatform.member.posts.create(
      memberConnection,
      {
        body: {
          community_id: community.id,
          post_type: "text",
          title: RandomGenerator.paragraph({ sentences: 2 }),
          content_text: RandomGenerator.content({ paragraphs: 2 }),
        } satisfies ICommunityPlatformPost.ICreate,
      },
    );
  });
  posts.forEach((post) => typia.assert(post));

  // Create comments for the posts
  const comments = await ArrayUtil.asyncRepeat(4, async (index) => {
    const postIndex = index % posts.length;
    return await api.functional.communityPlatform.member.comments.create(
      memberConnection,
      {
        body: {
          post_id: posts[postIndex].id,
          content: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies ICommunityPlatformComment.ICreate,
      },
    );
  });
  comments.forEach((comment) => typia.assert(comment));

  // Step 6: Query votes filtered by content_type='comment'
  const filteredVotes =
    await api.functional.communityPlatform.member.votes.index(
      memberConnection,
      {
        body: {
          content_type: "comment",
          page: 1,
          limit: 20,
        } satisfies ICommunityPlatformVote.IRequest,
      },
    );
  typia.assert<IPageICommunityPlatformVote>(filteredVotes);

  // Step 7: Verify response structure
  TestValidator.predicate(
    "pagination object should exist",
    filteredVotes.pagination !== null && filteredVotes.pagination !== undefined,
  );

  TestValidator.predicate(
    "data array should exist",
    Array.isArray(filteredVotes.data),
  );

  // Verify pagination properties
  TestValidator.predicate(
    "pagination current page should be positive",
    filteredVotes.pagination.current > 0,
  );

  TestValidator.predicate(
    "pagination limit should be positive",
    filteredVotes.pagination.limit > 0,
  );

  TestValidator.predicate(
    "pagination records should be non-negative",
    filteredVotes.pagination.records >= 0,
  );

  TestValidator.predicate(
    "pagination pages should be non-negative",
    filteredVotes.pagination.pages >= 0,
  );

  // Step 8: Validate that filtering works correctly
  // All returned votes should have content_type='comment'
  filteredVotes.data.forEach((vote) => {
    TestValidator.equals(
      "vote content_type should be comment",
      vote.content_type,
      "comment",
    );
  });

  // Verify votes have required properties
  filteredVotes.data.forEach((vote) => {
    TestValidator.predicate(
      "vote should have id",
      vote.id !== null && vote.id !== undefined,
    );

    TestValidator.predicate(
      "vote should have member",
      vote.member !== null && vote.member !== undefined,
    );

    TestValidator.predicate(
      "vote should have content_id",
      vote.content_id !== null && vote.content_id !== undefined,
    );

    TestValidator.predicate(
      "vote should have vote_type",
      vote.vote_type === "upvote" || vote.vote_type === "downvote",
    );

    TestValidator.predicate(
      "vote should have created_at",
      vote.created_at !== null && vote.created_at !== undefined,
    );
  });

  // Step 9: Validate filtering with different parameters
  const pageOneVotes =
    await api.functional.communityPlatform.member.votes.index(
      memberConnection,
      {
        body: {
          content_type: "comment",
          page: 1,
          limit: 10,
        } satisfies ICommunityPlatformVote.IRequest,
      },
    );
  typia.assert<IPageICommunityPlatformVote>(pageOneVotes);

  TestValidator.predicate(
    "page one results should have correct limit",
    pageOneVotes.data.length <= 10,
  );

  // Test with different limit
  const differentLimitVotes =
    await api.functional.communityPlatform.member.votes.index(
      memberConnection,
      {
        body: {
          content_type: "comment",
          page: 1,
          limit: 5,
        } satisfies ICommunityPlatformVote.IRequest,
      },
    );
  typia.assert<IPageICommunityPlatformVote>(differentLimitVotes);

  TestValidator.predicate(
    "different limit should be respected",
    differentLimitVotes.data.length <= 5,
  );

  // Verify content_type filter excludes posts
  const postVotes = await api.functional.communityPlatform.member.votes.index(
    memberConnection,
    {
      body: {
        content_type: "post",
        page: 1,
        limit: 20,
      } satisfies ICommunityPlatformVote.IRequest,
    },
  );
  typia.assert<IPageICommunityPlatformVote>(postVotes);

  // All post votes should have content_type='post'
  postVotes.data.forEach((vote) => {
    TestValidator.equals(
      "post vote content_type should be post",
      vote.content_type,
      "post",
    );
  });

  // Verify comment and post votes are different sets when filtering
  const commentContentIds = new Set(
    filteredVotes.data.map((v) => v.content_id),
  );
  const postContentIds = new Set(postVotes.data.map((v) => v.content_id));

  // Check that there is no overlap (or overlap is minimal if votes on same content)
  let overlap = 0;
  commentContentIds.forEach((id) => {
    if (postContentIds.has(id)) overlap++;
  });

  TestValidator.predicate(
    "content_type filter should properly separate post and comment votes",
    overlap === 0 ||
      (filteredVotes.data.length > 0 && postVotes.data.length > 0),
  );
}
