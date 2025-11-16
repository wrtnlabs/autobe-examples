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
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformVote";

export async function test_api_post_votes_sorting_by_created_date(
  connection: api.IConnection,
) {
  // Step 1: Create administrator account for category setup
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const administrator = await api.functional.auth.administrator.join(
    connection,
    {
      body: {
        email: adminEmail,
        password: "AdminPassword123!",
        username: RandomGenerator.alphaNumeric(8),
        name: RandomGenerator.name(),
        href: "http://localhost/admin",
        referrer: "http://localhost",
        ip: "127.0.0.1",
      } satisfies ICommunityPlatformAdministrator.ICreate,
    },
  );
  typia.assert(administrator);

  // Step 2: Create category for community organization
  const category =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      {
        body: {
          name: "Technology",
          slug: RandomGenerator.alphaNumeric(8).toLowerCase(),
          display_order: 1,
          description: "Technology and programming discussions",
        } satisfies ICommunityPlatformCategory.ICreate,
      },
    );
  typia.assert(category);

  // Step 3: Create member account for post creation
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      username: RandomGenerator.alphaNumeric(8),
      password: "MemberPassword123!",
      href: "http://localhost/join",
      referrer: "http://localhost",
      ip: "127.0.0.1",
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(member);

  // Step 4: Create community
  const community =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: "Voting Test Community",
          identifier: `voting_${RandomGenerator.alphaNumeric(6).toLowerCase()}`,
          description: "Community for testing vote sorting functionality",
          visibility: "public",
          post_creation_restriction: "open_to_all",
          post_type_restriction: "all_types",
          category_slug: category.slug,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  // Step 5: Create post for vote testing
  const post = await api.functional.communityPlatform.member.posts.create(
    connection,
    {
      body: {
        community_id: community.id,
        post_type: "text",
        title: "Test post for vote sorting",
        content_text:
          "This post will receive votes to test sorting functionality",
        is_nsfw: false,
        has_spoiler: false,
      } satisfies ICommunityPlatformPost.ICreate,
    },
  );
  typia.assert(post);

  // Step 6-7: Create multiple members and cast votes
  const voteIds: string[] = [];

  // Create 5 additional members to cast votes
  for (let i = 0; i < 5; i++) {
    const voterEmail = typia.random<string & tags.Format<"email">>();
    const voter = await api.functional.auth.member.join(connection, {
      body: {
        email: voterEmail,
        username: `voter_${RandomGenerator.alphaNumeric(6)}`,
        password: "VoterPassword123!",
        href: "http://localhost/join",
        referrer: "http://localhost",
        ip: "127.0.0.1",
      } satisfies ICommunityPlatformMember.ICreate,
    });
    typia.assert(voter);

    // Alternate between upvote and downvote
    const voteType: "upvote" | "downvote" = i % 2 === 0 ? "upvote" : "downvote";
    const vote =
      await api.functional.communityPlatform.member.posts.votes.create(
        connection,
        {
          postId: post.id,
          body: {
            content_type: "post",
            content_id: post.id,
            vote_type: voteType,
          } satisfies ICommunityPlatformVote.ICreate,
        },
      );
    typia.assert(vote);
    voteIds.push(vote.id);
  }

  // Step 8-9: Retrieve votes in descending order (newest first)
  const votesDescending =
    await api.functional.communityPlatform.posts.votes.index(connection, {
      postId: post.id,
      body: {
        page: 1,
        limit: 10,
        sort_by: "created_at",
        order: "desc",
      } satisfies ICommunityPlatformVote.IRequest,
    });
  typia.assert(votesDescending);

  // Validate descending order: votes should be newest first
  TestValidator.predicate(
    "descending votes list should have data",
    votesDescending.data.length > 0,
  );

  for (let i = 0; i < votesDescending.data.length - 1; i++) {
    const current = votesDescending.data[i];
    const next = votesDescending.data[i + 1];
    const currentTime = new Date(current.created_at).getTime();
    const nextTime = new Date(next.created_at).getTime();

    TestValidator.predicate(
      `vote at index ${i} should be newer than or equal to vote at index ${i + 1}`,
      currentTime >= nextTime,
    );
  }

  // Step 10-11: Retrieve votes in ascending order (oldest first)
  const votesAscending =
    await api.functional.communityPlatform.posts.votes.index(connection, {
      postId: post.id,
      body: {
        page: 1,
        limit: 10,
        sort_by: "created_at",
        order: "asc",
      } satisfies ICommunityPlatformVote.IRequest,
    });
  typia.assert(votesAscending);

  // Validate ascending order: votes should be oldest first
  TestValidator.predicate(
    "ascending votes list should have data",
    votesAscending.data.length > 0,
  );

  for (let i = 0; i < votesAscending.data.length - 1; i++) {
    const current = votesAscending.data[i];
    const next = votesAscending.data[i + 1];
    const currentTime = new Date(current.created_at).getTime();
    const nextTime = new Date(next.created_at).getTime();

    TestValidator.predicate(
      `vote at index ${i} should be older than or equal to vote at index ${i + 1}`,
      currentTime <= nextTime,
    );
  }

  // Step 12: Verify sort order affects sequence without changing data
  TestValidator.equals(
    "total vote count should be same in both orders",
    votesDescending.data.length,
    votesAscending.data.length,
  );

  // Verify vote IDs match between orders (just in different sequence)
  const descVoteIds = votesDescending.data.map((v) => v.id).sort();
  const ascVoteIds = votesAscending.data.map((v) => v.id).sort();

  TestValidator.equals(
    "vote IDs should match between ascending and descending orders",
    descVoteIds,
    ascVoteIds,
  );

  // Step 13: Verify pagination metadata is consistent
  TestValidator.equals(
    "pagination records should match between orders",
    votesDescending.pagination.records,
    votesAscending.pagination.records,
  );

  TestValidator.equals(
    "pagination pages should match between orders",
    votesDescending.pagination.pages,
    votesAscending.pagination.pages,
  );
}
