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
 * Validate moderator filtering of voting records by member ID.
 *
 * Tests that moderators can filter voting records to retrieve only votes cast
 * by a specific member. This ensures the member_id filter parameter in the
 * voting records endpoint correctly isolates votes from individual voters.
 *
 * Test workflow:
 *
 * 1. Create a moderator account for voting record access
 * 2. Create a community and post for voting activity
 * 3. Create multiple member accounts to generate diverse voting data
 * 4. Have each member cast votes on the post
 * 5. Use moderator to filter votes by a specific member's ID
 * 6. Verify the filtered results contain only votes from the target member
 * 7. Validate filtering accuracy and vote isolation
 */
export async function test_api_voting_records_moderator_filter_by_member(
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

  // Step 2: Create initial member for community setup
  const communityCreatorEmail = typia.random<string & tags.Format<"email">>();
  const communityCreatorPassword = RandomGenerator.alphaNumeric(12);
  const communityCreator: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: communityCreatorEmail,
        username: RandomGenerator.alphabets(8),
        password: communityCreatorPassword,
        href: "http://localhost:3000/auth/member/join",
        referrer: "http://localhost:3000",
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(communityCreator);

  // Step 3: Create community and post
  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 2 }),
          identifier: RandomGenerator.alphabets(10),
          visibility: "public",
          post_creation_restriction: "open_to_all",
          post_type_restriction: "all_types",
          category_slug: "technology",
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

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

  // Step 4: Create multiple members and have them vote
  const memberIds: string[] = [];
  const memberCredentials: { id: string; email: string; password: string }[] =
    [];

  for (let i = 0; i < 3; i++) {
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
    memberIds.push(member.id);
    memberCredentials.push({
      id: member.id,
      email: memberEmail,
      password: memberPassword,
    });

    // Cast vote on the post
    const vote: ICommunityPlatformVote =
      await api.functional.communityPlatform.member.votes.create(connection, {
        body: {
          content_type: "post",
          content_id: post.id,
          vote_type: i % 2 === 0 ? "upvote" : "downvote",
        } satisfies ICommunityPlatformVote.ICreate,
      });
    typia.assert(vote);
  }

  // Step 5: Login as moderator
  await api.functional.auth.moderator.login(connection, {
    body: {
      email: moderatorEmail,
      password: moderatorPassword,
      href: "http://localhost:3000/auth/moderator/login",
      referrer: "http://localhost:3000",
    } satisfies ICommunityPlatformModerator.ILogin,
  });

  // Step 6: Filter votes by first member ID
  const targetMemberId = memberIds[0];
  const filteredVotes: IPageICommunityPlatformVote =
    await api.functional.communityPlatform.moderator.votes.index(connection, {
      body: {
        page: 1,
        limit: 20,
        member_id: targetMemberId,
      } satisfies ICommunityPlatformVote.IRequest,
    });
  typia.assert(filteredVotes);

  // Step 7: Verify all filtered votes belong to target member
  TestValidator.predicate(
    "all filtered votes should belong to target member",
    () =>
      filteredVotes.data.every(
        (vote) => vote.community_platform_member_id === targetMemberId,
      ),
  );

  TestValidator.predicate(
    "should retrieve at least one vote from target member",
    filteredVotes.data.length > 0,
  );

  // Step 8: Verify filter excludes other members' votes
  const secondMemberId = memberIds[1];
  const secondMemberFilteredVotes: IPageICommunityPlatformVote =
    await api.functional.communityPlatform.moderator.votes.index(connection, {
      body: {
        page: 1,
        limit: 20,
        member_id: secondMemberId,
      } satisfies ICommunityPlatformVote.IRequest,
    });
  typia.assert(secondMemberFilteredVotes);

  TestValidator.predicate(
    "second member votes should only contain votes from second member",
    () =>
      secondMemberFilteredVotes.data.every(
        (vote) => vote.community_platform_member_id === secondMemberId,
      ),
  );

  TestValidator.predicate(
    "second member should have at least one vote",
    secondMemberFilteredVotes.data.length > 0,
  );

  // Step 9: Verify vote isolation - ensure results are different for different members
  const targetMemberVoteIds = new Set(
    filteredVotes.data.map((vote) => vote.id),
  );
  const secondMemberVoteIds = new Set(
    secondMemberFilteredVotes.data.map((vote) => vote.id),
  );

  TestValidator.predicate(
    "different members should have different vote IDs",
    () => {
      for (const voteId of targetMemberVoteIds) {
        if (secondMemberVoteIds.has(voteId)) {
          return false;
        }
      }
      return true;
    },
  );
}
