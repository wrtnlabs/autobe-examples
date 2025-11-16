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
 * Validates the unique constraint that each member can only have one vote per
 * post.
 *
 * Tests the voting system's enforcement of the one-vote-per-member-per-post
 * constraint. This ensures:
 *
 * 1. Initial vote can be cast successfully
 * 2. Attempting to cast a second vote is handled correctly (either returns
 *    existing or updates)
 * 3. Vote counts remain consistent and reflect the constraint
 * 4. No duplicate votes are created in the system
 *
 * Process:
 *
 * 1. Set up administrator account and create a category
 * 2. Create member account for voting
 * 3. Create community and post
 * 4. Cast initial upvote on the post
 * 5. Attempt to cast another upvote (same vote type)
 * 6. Verify only one vote exists from the member
 * 7. Validate vote counts are correct
 */
export async function test_api_post_votes_one_vote_per_member_constraint(
  connection: api.IConnection,
) {
  // Step 1: Administrator setup and category creation
  const adminEmail = `admin_${RandomGenerator.alphaNumeric(8)}@test.com`;
  const adminPassword = "TestPassword123!";
  const admin = await api.functional.auth.administrator.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      username: `admin_${RandomGenerator.alphaNumeric(6)}`,
      name: "Test Administrator",
      href: "http://localhost:3000/admin",
      referrer: "",
    } satisfies ICommunityPlatformAdministrator.ICreate,
  });
  typia.assert(admin);

  // Create category for community
  const category =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      {
        body: {
          name: "Technology",
          slug: `tech_${RandomGenerator.alphaNumeric(6)}`,
          display_order: 1,
          description: "Technology discussion community",
        } satisfies ICommunityPlatformCategory.ICreate,
      },
    );
  typia.assert(category);

  // Step 2: Member setup for voting
  const memberEmail = `member_${RandomGenerator.alphaNumeric(8)}@test.com`;
  const memberPassword = "MemberPassword123!";
  const member = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      username: `member_${RandomGenerator.alphaNumeric(6)}`,
      password: memberPassword,
      href: "http://localhost:3000/register",
      referrer: "",
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(member);

  // Step 3: Create community and post
  const community =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 2 }),
          identifier: `comm_${RandomGenerator.alphaNumeric(8)}`,
          description: RandomGenerator.paragraph({ sentences: 3 }),
          visibility: "public",
          post_creation_restriction: "open_to_all",
          post_type_restriction: "all_types",
          category_slug: category.slug,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  // Create a post to vote on
  const post = await api.functional.communityPlatform.member.posts.create(
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
  typia.assert(post);

  // Step 4: Cast initial upvote on the post
  const initialVote =
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
  TestValidator.equals("initial vote created", initialVote.vote_type, "upvote");
  TestValidator.equals(
    "initial vote member matches",
    initialVote.community_platform_member_id,
    member.id,
  );

  // Record initial vote details
  const initialVoteId = initialVote.id;
  const initialCreatedAt = initialVote.created_at;

  // Step 5: Attempt to cast another upvote (same vote type)
  const secondVoteAttempt =
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
  typia.assert(secondVoteAttempt);

  // Step 6: Verify only one vote exists from the member
  // The second attempt should either return the same vote or update it without duplication
  TestValidator.equals(
    "second upvote returns same vote ID",
    secondVoteAttempt.id,
    initialVoteId,
  );
  TestValidator.equals(
    "second upvote maintains vote type",
    secondVoteAttempt.vote_type,
    "upvote",
  );

  // Step 7: Validate vote counts are correct
  // Both votes should be the same upvote, so no duplication occurred
  TestValidator.predicate(
    "vote constraint enforced - no duplicate votes created",
    initialVote.id === secondVoteAttempt.id,
  );
}
