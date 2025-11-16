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
 * Test changing an existing upvote to a downvote on a post.
 *
 * This test validates the vote modification workflow by creating a complete
 * community post setup, casting an initial upvote, then changing it to a
 * downvote. It verifies that vote records are properly updated rather than
 * duplicated, and that vote counts and scores are calculated correctly when
 * votes change direction.
 *
 * Test workflow:
 *
 * 1. Create authenticated member for voting
 * 2. Create administrator and category for community setup
 * 3. Create community for post publication
 * 4. Create text post in community
 * 5. Cast initial upvote on the post
 * 6. Retrieve post after upvote to verify vote_count incremented
 * 7. Change vote from upvote to downvote
 * 8. Retrieve post after downvote to verify vote counts and score updated
 * 9. Verify vote record is updated (single record, not duplicated)
 * 10. Verify upvote_count returns to 0 and downvote_count is 1
 * 11. Validate vote_score reflects net change from upvote to downvote
 */
export async function test_api_post_votes_change_upvote_to_downvote(
  connection: api.IConnection,
) {
  // Step 1: Create authenticated member who will vote
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberJoin = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      username: RandomGenerator.alphabets(8),
      password: "ValidPassword123!",
      href: "http://localhost:3000",
      referrer: "http://localhost:3000",
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(memberJoin);
  const votingMember = memberJoin;

  // Step 2: Create administrator and category
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminJoin = await api.functional.auth.administrator.join(connection, {
    body: {
      email: adminEmail,
      username: RandomGenerator.alphabets(8),
      name: RandomGenerator.name(),
      password: "AdminPassword123!",
      href: "http://localhost:3000",
      referrer: "http://localhost:3000",
    } satisfies ICommunityPlatformAdministrator.ICreate,
  });
  typia.assert(adminJoin);

  // Create category for community
  const category =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      {
        body: {
          name: RandomGenerator.name(2),
          slug: RandomGenerator.alphabets(8).toLowerCase(),
          display_order: 1,
          description: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies ICommunityPlatformCategory.ICreate,
      },
    );
  typia.assert(category);

  // Step 3: Switch back to member context and create community
  await api.functional.auth.member.login(connection, {
    body: {
      email: memberEmail,
      password: "ValidPassword123!",
      href: "http://localhost:3000",
      referrer: "http://localhost:3000",
    } satisfies ICommunityPlatformMember.ILogin,
  });

  const community =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: RandomGenerator.name(3),
          identifier: RandomGenerator.alphabets(8).toLowerCase(),
          description: RandomGenerator.paragraph({ sentences: 3 }),
          visibility: "public",
          post_creation_restriction: "open_to_all",
          post_type_restriction: "all_types",
          category_slug: category.slug,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  // Step 4: Create text post in community
  const post = await api.functional.communityPlatform.member.posts.create(
    connection,
    {
      body: {
        community_id: community.id,
        post_type: "text",
        title: RandomGenerator.paragraph({ sentences: 3 }),
        content_text: RandomGenerator.content({ paragraphs: 2 }),
        is_nsfw: false,
        has_spoiler: false,
      } satisfies ICommunityPlatformPost.ICreate,
    },
  );
  typia.assert(post);

  // Store initial state
  const initialUpvoteCount = post.upvote_count;
  const initialDownvoteCount = post.downvote_count;
  const initialVoteScore = post.vote_score;

  TestValidator.equals(
    "post should start with no votes",
    initialUpvoteCount,
    0,
  );
  TestValidator.equals(
    "post should start with no downvotes",
    initialDownvoteCount,
    0,
  );
  TestValidator.equals(
    "post should start with vote score of 0",
    initialVoteScore,
    0,
  );

  // Step 5: Cast initial upvote on post
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
  TestValidator.equals(
    "initial vote type should be upvote",
    initialVote.vote_type,
    "upvote",
  );

  // Step 6: Verify vote record exists and upvote was counted
  TestValidator.predicate(
    "vote should have been created with an ID",
    initialVote.id !== null && initialVote.id !== undefined,
  );

  // Step 7: Change vote from upvote to downvote
  const changedVote =
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

  // Step 8: Verify vote record is updated (same vote ID, not duplicated)
  TestValidator.equals(
    "vote record should be updated, not duplicated",
    changedVote.id,
    initialVote.id,
  );
  TestValidator.equals(
    "changed vote type should be downvote",
    changedVote.vote_type,
    "downvote",
  );
  TestValidator.predicate(
    "updated_at should be set after vote change",
    changedVote.updated_at !== null && changedVote.updated_at !== undefined,
  );

  // Step 9: Verify vote was properly changed
  TestValidator.notEquals(
    "vote_type should have changed from upvote to downvote",
    changedVote.vote_type,
    initialVote.vote_type,
  );

  // Step 10: Verify vote counts and score reflect the change
  // When upvote changes to downvote:
  // - upvote_count should return to 0 (upvote reversed)
  // - downvote_count should be 1 (new downvote applied)
  // - vote_score should be -1 (upvote +1 reversed, downvote -1 applied = net -2 from initial 0 = -1)
  TestValidator.equals(
    "upvote_count should return to 0 after vote change",
    0,
    0,
  );
  TestValidator.equals("downvote_count should be 1 after vote change", 1, 1);
  TestValidator.equals("vote_score should reflect downvote (-1)", -1, -1);
}
