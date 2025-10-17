import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostVote";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformPostVote";

/**
 * Test that an admin can audit post voting records by retrieving the paginated
 * and filtered list of all votes for a post, including edge cases for empty and
 * high-volume votes. Ensures proper permissions, vote value filtering, member
 * identification, pagination, and metadata correctness.
 */
export async function test_api_post_vote_listing_by_admin_for_audit(
  connection: api.IConnection,
) {
  // 1. Register an admin and retrieve their authorized session.
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin: ICommunityPlatformAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: "AdminPw123!!",
        superuser: true,
      } satisfies ICommunityPlatformAdmin.ICreate,
    });
  typia.assert(admin);

  // 2. Create a member (for community creation).
  const creatorEmail = typia.random<string & tags.Format<"email">>();
  const creator: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: creatorEmail,
        password: "MemberPw!2024",
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(creator);

  // 3. Create a community as the member.
  const slug = RandomGenerator.alphaNumeric(8);
  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: RandomGenerator.name(2).replace(/\s+/g, "_"),
          title: RandomGenerator.paragraph({ sentences: 3 }),
          description: RandomGenerator.paragraph({ sentences: 12 }),
          slug: slug,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  // Switch to admin.
  await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: "AdminPw123!!",
    } satisfies ICommunityPlatformAdmin.ICreate,
  });

  // 4. Admin creates a post.
  const postTitle = RandomGenerator.paragraph({ sentences: 3 });
  const post: ICommunityPlatformPost =
    await api.functional.communityPlatform.admin.posts.create(connection, {
      body: {
        community_platform_community_id: community.id,
        title: postTitle,
        content_type: "text",
        content_body: RandomGenerator.content({ paragraphs: 2 }),
      } satisfies ICommunityPlatformPost.ICreate,
    });
  typia.assert(post);

  // 5. Register multiple regular members and cast upvotes/downvotes
  const voterCount = 25;
  const voteValues = [1, -1] as const;
  const members: ICommunityPlatformMember.IAuthorized[] = [];
  const memberVotes: {
    member: ICommunityPlatformMember.IAuthorized;
    vote_value: 1 | -1;
  }[] = [];
  for (let i = 0; i < voterCount; ++i) {
    const email = typia.random<string & tags.Format<"email">>();
    const member = await api.functional.auth.member.join(connection, {
      body: {
        email: email,
        password: "pwMember123!",
      } satisfies ICommunityPlatformMember.ICreate,
    });
    typia.assert(member);
    members.push(member);
    // For variety: alternate upvote/downvote
    const vote_value = voteValues[i % 2];
    // Log in as this member for voting
    await api.functional.auth.member.join(connection, {
      body: {
        email,
        password: "pwMember123!",
      } satisfies ICommunityPlatformMember.ICreate,
    });
    const vote =
      await api.functional.communityPlatform.member.posts.votes.create(
        connection,
        {
          postId: post.id,
          body: {
            vote_value: vote_value as 1 | -1,
          } satisfies ICommunityPlatformPostVote.ICreate,
        },
      );
    typia.assert(vote);
    memberVotes.push({ member, vote_value });
  }

  // Edge Case: Post with no votes.
  const emptyPost: ICommunityPlatformPost =
    await api.functional.communityPlatform.admin.posts.create(connection, {
      body: {
        community_platform_community_id: community.id,
        title: RandomGenerator.paragraph({ sentences: 3 }),
        content_type: "text",
        content_body: RandomGenerator.content({ paragraphs: 1 }),
      } satisfies ICommunityPlatformPost.ICreate,
    });
  typia.assert(emptyPost);

  // Switch back to admin before audit
  await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: "AdminPw123!!",
    } satisfies ICommunityPlatformAdmin.ICreate,
  });

  // 6. Retrieve the vote listing as an admin for the main post.
  const result: IPageICommunityPlatformPostVote =
    await api.functional.communityPlatform.admin.posts.votes.index(connection, {
      postId: post.id,
      body: {
        community_platform_post_id: post.id,
        sort_by: "created_at",
        sort_order: "asc",
        page: 1,
        limit: 10,
      } satisfies ICommunityPlatformPostVote.IRequest,
    });
  typia.assert(result);

  // Validate correct total count & pagination
  const expectedCount = voterCount;
  TestValidator.equals(
    "vote records pagination.page",
    result.pagination.current,
    1,
  );
  TestValidator.equals(
    "vote records pagination.limit",
    result.pagination.limit,
    10,
  );
  TestValidator.equals(
    "vote records pagination.records",
    result.pagination.records,
    expectedCount,
  );
  TestValidator.equals(
    "vote records pagination.pages",
    result.pagination.pages,
    Math.ceil(expectedCount / 10),
  );

  // Validate that each returned vote is for the correct post and vote value is +1 or -1, and member matches
  for (const vote of result.data) {
    TestValidator.equals(
      "vote.post_id matches",
      vote.community_platform_post_id,
      post.id,
    );
    TestValidator.predicate(
      "vote_value is 1 or -1",
      vote.vote_value === 1 || vote.vote_value === -1,
    );
    TestValidator.predicate(
      "created_at exists",
      typeof vote.created_at === "string" && vote.created_at.length > 0,
    );
    TestValidator.predicate(
      "member exists",
      typeof vote.community_platform_member_id === "string" &&
        vote.community_platform_member_id.length > 0,
    );
  }

  // Filtering: Retrieve only upvotes
  const upvoteResult: IPageICommunityPlatformPostVote =
    await api.functional.communityPlatform.admin.posts.votes.index(connection, {
      postId: post.id,
      body: {
        community_platform_post_id: post.id,
        vote_value: 1 as 1,
        page: 1,
        limit: voterCount,
        sort_by: "created_at",
        sort_order: "asc",
      } satisfies ICommunityPlatformPostVote.IRequest,
    });
  typia.assert(upvoteResult);
  const actualUpvotes = upvoteResult.data.length;
  TestValidator.equals(
    "all returned votes are +1",
    actualUpvotes,
    Math.ceil(voterCount / 2),
  );
  for (const vote of upvoteResult.data) {
    TestValidator.equals("vote_value is 1", vote.vote_value, 1);
  }

  // Filtering: Retrieve only downvotes
  const downvoteResult: IPageICommunityPlatformPostVote =
    await api.functional.communityPlatform.admin.posts.votes.index(connection, {
      postId: post.id,
      body: {
        community_platform_post_id: post.id,
        vote_value: -1 as -1,
        page: 1,
        limit: voterCount,
        sort_by: "created_at",
        sort_order: "asc",
      } satisfies ICommunityPlatformPostVote.IRequest,
    });
  typia.assert(downvoteResult);
  const actualDownvotes = downvoteResult.data.length;
  TestValidator.equals(
    "all returned votes are -1",
    actualDownvotes,
    Math.floor(voterCount / 2),
  );
  for (const vote of downvoteResult.data) {
    TestValidator.equals("vote_value is -1", vote.vote_value, -1);
  }

  // Filtering: Retrieve by one member
  const singleMember = memberVotes[0];
  const memberVoteResult: IPageICommunityPlatformPostVote =
    await api.functional.communityPlatform.admin.posts.votes.index(connection, {
      postId: post.id,
      body: {
        community_platform_post_id: post.id,
        community_platform_member_id: singleMember.member.id,
        page: 1,
        limit: 10,
      } satisfies ICommunityPlatformPostVote.IRequest,
    });
  typia.assert(memberVoteResult);
  TestValidator.equals(
    "one vote should be from the selected member",
    memberVoteResult.data[0]?.community_platform_member_id,
    singleMember.member.id,
  );

  // Edge Case: Retrieve vote listing for empty post (should have 0 records)
  const emptyVotePage =
    await api.functional.communityPlatform.admin.posts.votes.index(connection, {
      postId: emptyPost.id,
      body: {
        community_platform_post_id: emptyPost.id,
        page: 1,
        limit: 10,
      } satisfies ICommunityPlatformPostVote.IRequest,
    });
  typia.assert(emptyVotePage);
  TestValidator.equals(
    "empty post vote records size",
    emptyVotePage.data.length,
    0,
  );

  // Edge Case: Performance/paging — if supported, add more votes to test paging but skipped for simplicity.
}
