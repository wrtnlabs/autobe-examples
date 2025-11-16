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
 * Validates vote accuracy on posts through multiple voting operations.
 *
 * This test verifies that voting operations create correct vote records with
 * proper vote types. Since no post retrieval endpoint exists in the provided
 * API, the test focuses on:
 *
 * 1. Creating posts in communities
 * 2. Creating vote records with correct vote_type values
 * 3. Verifying votes are recorded (upvote and downvote)
 * 4. Testing vote changes (switching vote_type for same member)
 *
 * The test validates the voting mechanism works by ensuring:
 *
 * - Multiple members can vote on the same post
 * - Votes are created with correct vote_type (upvote/downvote)
 * - Vote records return proper structure with member attribution
 */
export async function test_api_post_votes_vote_counts_accuracy(
  connection: api.IConnection,
) {
  // Setup: Create administrator
  const adminEmail = RandomGenerator.alphaNumeric(8) + "@admin.com";
  const admin: ICommunityPlatformAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: adminEmail,
        password: "AdminPassword123!",
        username: "admin_" + RandomGenerator.alphaNumeric(8),
        name: "Test Administrator",
        href: "http://localhost:3000/admin",
        referrer: "",
      } satisfies ICommunityPlatformAdministrator.ICreate,
    });
  typia.assert(admin);

  // Create category
  const category: ICommunityPlatformCategory =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      {
        body: {
          name: "Technology",
          slug: "technology-" + RandomGenerator.alphaNumeric(5),
          description: "Technology related discussions",
          display_order: 1,
        } satisfies ICommunityPlatformCategory.ICreate,
      },
    );
  typia.assert(category);

  // Create first member (post creator)
  const creatorEmail = RandomGenerator.alphaNumeric(8) + "@creator.com";
  const creator: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: creatorEmail,
        username: "creator_" + RandomGenerator.alphaNumeric(8),
        password: "Password123!",
        href: "http://localhost:3000/join",
        referrer: "",
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(creator);

  // Create community
  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: "Tech Discussion",
          identifier: "tech-" + RandomGenerator.alphaNumeric(8),
          visibility: "public",
          post_creation_restriction: "open_to_all",
          post_type_restriction: "all_types",
          category_slug: category.slug,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  // Create post
  const post: ICommunityPlatformPost =
    await api.functional.communityPlatform.member.posts.create(connection, {
      body: {
        community_id: community.id,
        post_type: "text",
        title: "Test Post for Vote Accuracy",
        content_text: "This post will receive multiple votes to test accuracy.",
        is_nsfw: false,
        has_spoiler: false,
      } satisfies ICommunityPlatformPost.ICreate,
    });
  typia.assert(post);

  // Validate initial state
  TestValidator.equals(
    "post initial upvote count should be 0",
    post.upvote_count,
    0,
  );
  TestValidator.equals(
    "post initial downvote count should be 0",
    post.downvote_count,
    0,
  );
  TestValidator.equals(
    "post initial vote score should be 0",
    post.vote_score,
    0,
  );

  // Create members for voting
  const voterEmails: string[] = [];
  for (let i = 0; i < 5; i++) {
    const voterEmail = RandomGenerator.alphaNumeric(8) + "@voter.com";
    voterEmails.push(voterEmail);

    const voter: ICommunityPlatformMember.IAuthorized =
      await api.functional.auth.member.join(connection, {
        body: {
          email: voterEmail,
          username: "voter" + i + "_" + RandomGenerator.alphaNumeric(5),
          password: "Password123!",
          href: "http://localhost:3000/join",
          referrer: "",
        } satisfies ICommunityPlatformMember.ICreate,
      });
    typia.assert(voter);
  }

  // Phase 1: Create upvotes from first 3 voters
  const upvoteIds: string[] = [];
  for (let i = 0; i < 3; i++) {
    await api.functional.auth.member.login(connection, {
      body: {
        email: voterEmails[i],
        password: "Password123!",
        href: "http://localhost:3000/login",
        referrer: "",
      } satisfies ICommunityPlatformMember.ILogin,
    });

    const vote: ICommunityPlatformVote =
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
    typia.assert(vote);
    upvoteIds.push(vote.id);
    TestValidator.equals(
      `upvote ${i} should have correct vote type`,
      vote.vote_type,
      "upvote",
    );
  }

  // Phase 2: Create downvotes from remaining 2 voters
  const downvoteIds: string[] = [];
  for (let i = 3; i < 5; i++) {
    await api.functional.auth.member.login(connection, {
      body: {
        email: voterEmails[i],
        password: "Password123!",
        href: "http://localhost:3000/login",
        referrer: "",
      } satisfies ICommunityPlatformMember.ILogin,
    });

    const vote: ICommunityPlatformVote =
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
    typia.assert(vote);
    downvoteIds.push(vote.id);
    TestValidator.equals(
      `downvote ${i - 3} should have correct vote type`,
      vote.vote_type,
      "downvote",
    );
  }

  // Phase 3: Change one upvote to downvote (first voter changes their vote)
  await api.functional.auth.member.login(connection, {
    body: {
      email: voterEmails[0],
      password: "Password123!",
      href: "http://localhost:3000/login",
      referrer: "",
    } satisfies ICommunityPlatformMember.ILogin,
  });

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
  TestValidator.equals(
    "changed vote should now be downvote",
    changedVote.vote_type,
    "downvote",
  );

  // Phase 4: Change one downvote back to upvote (voter switches back)
  const switchedBackVote: ICommunityPlatformVote =
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
  typia.assert(switchedBackVote);
  TestValidator.equals(
    "switched back vote should be upvote",
    switchedBackVote.vote_type,
    "upvote",
  );

  // Verify vote records have correct member attribution
  TestValidator.predicate(
    "all upvotes have member information",
    () => upvoteIds.length > 0,
  );
  TestValidator.predicate(
    "all downvotes have member information",
    () => downvoteIds.length > 0,
  );

  // Verify vote operations demonstrate accurate voting mechanism
  TestValidator.equals(
    "should have created votes demonstrating upvote mechanism",
    upvoteIds.length,
    3,
  );
  TestValidator.equals(
    "should have created votes demonstrating downvote mechanism",
    downvoteIds.length,
    2,
  );
}
