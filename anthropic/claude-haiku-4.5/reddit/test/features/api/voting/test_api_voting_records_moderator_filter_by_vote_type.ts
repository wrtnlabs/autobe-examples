import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCategory";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformVote";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformVote";

/**
 * Test that moderators can filter voting records by vote type (upvote or
 * downvote).
 *
 * This test validates the moderator vote filtering API by creating a moderator
 * and member account, setting up a community with posts, casting both upvotes
 * and downvotes, then filtering votes by type to ensure only the specified vote
 * type is returned.
 *
 * Steps:
 *
 * 1. Create moderator account
 * 2. Create member account
 * 3. Switch to member authentication
 * 4. Create community
 * 5. Create two posts
 * 6. Cast upvotes and downvotes on different posts
 * 7. Switch to moderator authentication
 * 8. Filter votes by upvote type and validate results
 * 9. Filter votes by downvote type and validate results
 * 10. Verify filtering accuracy
 */
export async function test_api_voting_records_moderator_filter_by_vote_type(
  connection: api.IConnection,
) {
  // Step 1: Create moderator account
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorPassword = RandomGenerator.alphaNumeric(12);
  const moderator: ICommunityPlatformModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        username: RandomGenerator.alphabets(8),
        password: moderatorPassword,
        href: "http://localhost:3000/auth/moderator/join",
        referrer: "http://localhost:3000",
      } satisfies ICommunityPlatformModerator.ICreate,
    });
  typia.assert(moderator);

  // Step 2: Create member account
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = RandomGenerator.alphaNumeric(12);
  const member: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        username: RandomGenerator.alphabets(8),
        password: memberPassword,
        href: "http://localhost:3000/auth/member/join",
        referrer: "http://localhost:3000",
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(member);

  // Step 3: Switch to member authentication
  await api.functional.auth.member.login(connection, {
    body: {
      email: memberEmail,
      password: memberPassword,
      href: "http://localhost:3000/auth/member/login",
      referrer: "http://localhost:3000",
    } satisfies ICommunityPlatformMember.ILogin,
  });

  // Step 4: Create community
  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 2 }),
          identifier: RandomGenerator.alphabets(8).toLowerCase(),
          description: RandomGenerator.paragraph({ sentences: 3 }),
          visibility: "public",
          post_creation_restriction: "open_to_all",
          post_type_restriction: "all_types",
          category_slug: "technology",
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  // Step 5: Create two posts
  const post1: ICommunityPlatformPost =
    await api.functional.communityPlatform.member.posts.create(connection, {
      body: {
        community_id: community.id,
        post_type: "text",
        title: RandomGenerator.paragraph({ sentences: 2 }),
        content_text: RandomGenerator.content({ paragraphs: 2 }),
      } satisfies ICommunityPlatformPost.ICreate,
    });
  typia.assert(post1);

  const post2: ICommunityPlatformPost =
    await api.functional.communityPlatform.member.posts.create(connection, {
      body: {
        community_id: community.id,
        post_type: "text",
        title: RandomGenerator.paragraph({ sentences: 2 }),
        content_text: RandomGenerator.content({ paragraphs: 2 }),
      } satisfies ICommunityPlatformPost.ICreate,
    });
  typia.assert(post2);

  // Step 6: Cast upvotes and downvotes on different posts
  const upvote1: ICommunityPlatformVote =
    await api.functional.communityPlatform.member.votes.create(connection, {
      body: {
        content_type: "post",
        content_id: post1.id,
        vote_type: "upvote",
      } satisfies ICommunityPlatformVote.ICreate,
    });
  typia.assert(upvote1);

  const downvote1: ICommunityPlatformVote =
    await api.functional.communityPlatform.member.votes.create(connection, {
      body: {
        content_type: "post",
        content_id: post2.id,
        vote_type: "downvote",
      } satisfies ICommunityPlatformVote.ICreate,
    });
  typia.assert(downvote1);

  // Step 7: Switch to moderator authentication
  await api.functional.auth.moderator.login(connection, {
    body: {
      email: moderatorEmail,
      password: moderatorPassword,
      href: "http://localhost:3000/auth/moderator/login",
      referrer: "http://localhost:3000",
    } satisfies ICommunityPlatformModerator.ILogin,
  });

  // Step 8: Filter votes by upvote type
  const upvoteResults: IPageICommunityPlatformVote =
    await api.functional.communityPlatform.moderator.votes.index(connection, {
      body: {
        page: 1,
        limit: 50,
        vote_type: "upvote",
      } satisfies ICommunityPlatformVote.IRequest,
    });
  typia.assert(upvoteResults);

  // Validate that all returned votes are upvotes
  TestValidator.predicate(
    "upvote filter should return only upvotes",
    upvoteResults.data.every((vote) => vote.vote_type === "upvote"),
  );

  // Verify that the upvote we created is in the results
  TestValidator.predicate(
    "created upvote should be in upvote filter results",
    upvoteResults.data.some((vote) => vote.id === upvote1.id),
  );

  // Step 9: Filter votes by downvote type
  const downvoteResults: IPageICommunityPlatformVote =
    await api.functional.communityPlatform.moderator.votes.index(connection, {
      body: {
        page: 1,
        limit: 50,
        vote_type: "downvote",
      } satisfies ICommunityPlatformVote.IRequest,
    });
  typia.assert(downvoteResults);

  // Validate that all returned votes are downvotes
  TestValidator.predicate(
    "downvote filter should return only downvotes",
    downvoteResults.data.every((vote) => vote.vote_type === "downvote"),
  );

  // Verify that the downvote we created is in the results
  TestValidator.predicate(
    "created downvote should be in downvote filter results",
    downvoteResults.data.some((vote) => vote.id === downvote1.id),
  );

  // Step 10: Verify filtering accuracy - upvotes and downvotes are distinct
  TestValidator.predicate(
    "upvote results should not contain any downvotes",
    !upvoteResults.data.some((vote) => vote.vote_type === "downvote"),
  );

  TestValidator.predicate(
    "downvote results should not contain any upvotes",
    !downvoteResults.data.some((vote) => vote.vote_type === "upvote"),
  );
}
