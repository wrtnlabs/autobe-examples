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

/**
 * Test vote modification where a member changes their post vote from upvote to
 * downvote.
 *
 * Validates the workflow where a member initially upvotes a post, then changes
 * their vote to a downvote. The system should update the existing vote record
 * rather than creating a duplicate. The test verifies that the response shows
 * vote_type='downvote' with an updated_at timestamp, and that only one vote
 * record exists for this member on this post.
 *
 * Steps:
 *
 * 1. Create administrator and authenticate
 * 2. Create a category for community classification
 * 3. Create member account and authenticate
 * 4. Create community within the category
 * 5. Create post within the community
 * 6. Cast initial upvote on the post
 * 7. Change vote from upvote to downvote
 * 8. Verify vote_type is 'downvote' and updated_at is set
 * 9. Verify only one vote record exists
 */
export async function test_api_post_vote_change_upvote_to_downvote(
  connection: api.IConnection,
) {
  // Step 1: Create administrator account
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const administrator: ICommunityPlatformAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: adminEmail,
        password: "TestPassword123!",
        username: RandomGenerator.alphabets(8),
        name: RandomGenerator.name(),
        href: "http://localhost:3000/admin/join",
        referrer: "http://localhost:3000",
      } satisfies ICommunityPlatformAdministrator.ICreate,
    });
  typia.assert(administrator);

  // Authenticate as administrator
  await api.functional.auth.administrator.login(connection, {
    body: {
      email: adminEmail,
      password: "TestPassword123!",
      href: "http://localhost:3000/admin/login",
      referrer: "http://localhost:3000",
    } satisfies ICommunityPlatformAdministrator.ILogin,
  });

  // Step 2: Create category
  const category: ICommunityPlatformCategory =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      {
        body: {
          name: "Technology",
          slug: RandomGenerator.alphaNumeric(10),
          description: "Technology and programming discussions",
          display_order: 1,
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
        username: RandomGenerator.alphabets(12),
        password: "MemberPassword123!",
        href: "http://localhost:3000/join",
        referrer: "http://localhost:3000",
        ip: "127.0.0.1",
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(member);

  // Authenticate as member
  await api.functional.auth.member.login(connection, {
    body: {
      email: memberEmail,
      password: "MemberPassword123!",
      href: "http://localhost:3000/login",
      referrer: "http://localhost:3000",
    } satisfies ICommunityPlatformMember.ILogin,
  });

  // Step 4: Create community
  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: "Web Development",
          identifier: RandomGenerator.alphaNumeric(10),
          description: "Discuss web development best practices",
          visibility: "public",
          post_creation_restriction: "open_to_all",
          post_type_restriction: "all_types",
          category_slug: category.slug,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  // Step 5: Create post
  const post: ICommunityPlatformPost =
    await api.functional.communityPlatform.member.posts.create(connection, {
      body: {
        community_id: community.id,
        post_type: "text",
        title: "Best practices for React performance",
        content_text: RandomGenerator.content({ paragraphs: 2 }),
        is_nsfw: false,
        has_spoiler: false,
      } satisfies ICommunityPlatformPost.ICreate,
    });
  typia.assert(post);

  // Step 6: Cast initial upvote
  const initialVote: ICommunityPlatformVote =
    await api.functional.communityPlatform.member.posts.votes.create(
      connection,
      {
        postId: post.id,
        body: {
          content_type: "post",
          content_id: post.id,
          vote_type: "upvote",
        } satisfies ICommunityPlatformVote.ICreate,
      },
    );
  typia.assert(initialVote);
  TestValidator.equals(
    "initial vote should be upvote",
    initialVote.vote_type,
    "upvote",
  );

  // Step 7: Change vote from upvote to downvote
  const changedVote: ICommunityPlatformVote =
    await api.functional.communityPlatform.member.posts.votes.create(
      connection,
      {
        postId: post.id,
        body: {
          content_type: "post",
          content_id: post.id,
          vote_type: "downvote",
        } satisfies ICommunityPlatformVote.ICreate,
      },
    );
  typia.assert(changedVote);

  // Step 8: Verify vote_type is downvote and updated_at is set
  TestValidator.equals(
    "vote_type should be downvote after change",
    changedVote.vote_type,
    "downvote",
  );
  TestValidator.predicate(
    "updated_at should be set when vote is changed",
    changedVote.updated_at !== null && changedVote.updated_at !== undefined,
  );
  TestValidator.equals(
    "vote IDs should match (same vote record updated)",
    changedVote.id,
    initialVote.id,
  );

  // Step 9: Verify updated_at is after created_at
  if (changedVote.updated_at) {
    const createdTime = new Date(initialVote.created_at).getTime();
    const updatedTime = new Date(changedVote.updated_at).getTime();
    TestValidator.predicate(
      "updated_at should be after or equal to created_at",
      updatedTime >= createdTime,
    );
  }
}
