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

export async function test_api_post_votes_retrieve_downvotes_only(
  connection: api.IConnection,
) {
  // Step 1: Administrator setup - create category for community organization
  const adminEmail = `admin-${RandomGenerator.alphaNumeric(8)}@test.com`;
  const adminPassword = RandomGenerator.alphaNumeric(12);
  const admin = await api.functional.auth.administrator.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      username: `admin_${RandomGenerator.alphaNumeric(8)}`,
      name: `Admin ${RandomGenerator.name()}`,
      href: "http://localhost:3000/admin",
      referrer: "http://localhost:3000",
    } satisfies ICommunityPlatformAdministrator.ICreate,
  });
  typia.assert(admin);

  const category =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      {
        body: {
          name: "Technology",
          slug: `tech-${RandomGenerator.alphaNumeric(6)}`,
          description: "Technology discussions",
          display_order: 1,
        } satisfies ICommunityPlatformCategory.ICreate,
      },
    );
  typia.assert(category);

  // Step 2: Member authentication - create post creator
  const creatorEmail = `creator-${RandomGenerator.alphaNumeric(8)}@test.com`;
  const creatorPassword = RandomGenerator.alphaNumeric(12);
  const creator = await api.functional.auth.member.join(connection, {
    body: {
      email: creatorEmail,
      password: creatorPassword,
      username: `creator_${RandomGenerator.alphaNumeric(8)}`,
      href: "http://localhost:3000/register",
      referrer: "http://localhost:3000",
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(creator);

  // Step 3: Community creation
  const community =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: `Tech Community ${RandomGenerator.name()}`,
          identifier: `tech-${RandomGenerator.alphaNumeric(8)}`,
          description: "A community for tech discussions",
          visibility: "public",
          post_creation_restriction: "open_to_all",
          post_type_restriction: "all_types",
          category_slug: category.slug,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  // Step 4: Create post in community
  const post = await api.functional.communityPlatform.member.posts.create(
    connection,
    {
      body: {
        community_id: community.id,
        post_type: "text",
        title: `Test Post ${RandomGenerator.name()}`,
        content_text: RandomGenerator.content({ paragraphs: 2 }),
        is_nsfw: false,
        has_spoiler: false,
      } satisfies ICommunityPlatformPost.ICreate,
    },
  );
  typia.assert(post);

  // Step 5: Create multiple members for voting with credential tracking
  const voterCredentials = await ArrayUtil.asyncRepeat(5, async (index) => {
    const voterEmail = `voter-${index}-${RandomGenerator.alphaNumeric(6)}@test.com`;
    const voterPassword = RandomGenerator.alphaNumeric(12);
    const voter = await api.functional.auth.member.join(connection, {
      body: {
        email: voterEmail,
        password: voterPassword,
        username: `voter_${index}_${RandomGenerator.alphaNumeric(6)}`,
        href: "http://localhost:3000/register",
        referrer: "http://localhost:3000",
      } satisfies ICommunityPlatformMember.ICreate,
    });
    typia.assert(voter);
    return { email: voterEmail, password: voterPassword, id: voter.id };
  });

  // Step 6: Cast votes - mix of upvotes and downvotes
  const downvotes: ICommunityPlatformVote[] = [];
  const allVotes: ICommunityPlatformVote[] = [];

  // Create downvotes (voters 0, 1)
  for (let i = 0; i < 2; i++) {
    await api.functional.auth.member.login(connection, {
      body: {
        email: voterCredentials[i].email,
        password: voterCredentials[i].password,
        href: "http://localhost:3000/login",
        referrer: "http://localhost:3000",
      } satisfies ICommunityPlatformMember.ILogin,
    });

    const downvote =
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
    typia.assert(downvote);
    downvotes.push(downvote);
    allVotes.push(downvote);
  }

  // Create upvotes (voters 2, 3, 4)
  for (let i = 2; i < 5; i++) {
    await api.functional.auth.member.login(connection, {
      body: {
        email: voterCredentials[i].email,
        password: voterCredentials[i].password,
        href: "http://localhost:3000/login",
        referrer: "http://localhost:3000",
      } satisfies ICommunityPlatformMember.ILogin,
    });

    const upvote =
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
    typia.assert(upvote);
    allVotes.push(upvote);
  }

  // Step 7: Re-authenticate as creator for vote retrieval
  await api.functional.auth.member.login(connection, {
    body: {
      email: creatorEmail,
      password: creatorPassword,
      href: "http://localhost:3000/login",
      referrer: "http://localhost:3000",
    } satisfies ICommunityPlatformMember.ILogin,
  });

  // Step 8: Retrieve votes filtered by downvote type
  const downvoteResponse =
    await api.functional.communityPlatform.posts.votes.index(connection, {
      postId: post.id,
      body: {
        page: 1,
        limit: 10,
        vote_type: "downvote",
        sort_by: "created_at",
        order: "asc",
      } satisfies ICommunityPlatformVote.IRequest,
    });
  typia.assert(downvoteResponse);

  // Step 9: Validate downvote filtering results
  TestValidator.equals(
    "downvote count matches response data length",
    downvoteResponse.data.length,
    2,
  );

  TestValidator.predicate(
    "all returned votes are downvotes",
    downvoteResponse.data.every((vote) => vote.vote_type === "downvote"),
  );

  // Step 10: Verify each vote record has correct structure
  for (const vote of downvoteResponse.data) {
    TestValidator.equals(
      "vote content type is post",
      vote.content_type,
      "post",
    );
    TestValidator.equals(
      "vote content id matches post id",
      vote.content_id,
      post.id,
    );
    TestValidator.predicate(
      "vote has valid timestamp",
      vote.created_at !== null && vote.created_at !== undefined,
    );
  }

  // Step 11: Test pagination with different limits
  const limitOneResponse =
    await api.functional.communityPlatform.posts.votes.index(connection, {
      postId: post.id,
      body: {
        page: 1,
        limit: 1,
        vote_type: "downvote",
      } satisfies ICommunityPlatformVote.IRequest,
    });
  typia.assert(limitOneResponse);
  TestValidator.equals("page limit respected", limitOneResponse.data.length, 1);
  TestValidator.equals(
    "pagination total records correct",
    limitOneResponse.pagination.records,
    2,
  );

  // Step 12: Test sorting in descending order
  const descendingResponse =
    await api.functional.communityPlatform.posts.votes.index(connection, {
      postId: post.id,
      body: {
        page: 1,
        limit: 10,
        vote_type: "downvote",
        sort_by: "created_at",
        order: "desc",
      } satisfies ICommunityPlatformVote.IRequest,
    });
  typia.assert(descendingResponse);

  // Verify the timestamps are in descending order
  if (descendingResponse.data.length > 1) {
    for (let i = 0; i < descendingResponse.data.length - 1; i++) {
      const current = new Date(descendingResponse.data[i].created_at).getTime();
      const next = new Date(
        descendingResponse.data[i + 1].created_at,
      ).getTime();
      TestValidator.predicate(
        "downvotes sorted in descending order",
        current >= next,
      );
    }
  }

  // Step 13: Retrieve all votes without filter to verify counts
  const allVotesResponse =
    await api.functional.communityPlatform.posts.votes.index(connection, {
      postId: post.id,
      body: {
        page: 1,
        limit: 100,
      } satisfies ICommunityPlatformVote.IRequest,
    });
  typia.assert(allVotesResponse);

  TestValidator.equals(
    "total vote count is correct",
    allVotesResponse.pagination.records,
    5,
  );

  const upvoteCount = allVotesResponse.data.filter(
    (vote) => vote.vote_type === "upvote",
  ).length;
  const downvoteCount = allVotesResponse.data.filter(
    (vote) => vote.vote_type === "downvote",
  ).length;

  TestValidator.equals("upvote count in full response", upvoteCount, 3);
  TestValidator.equals("downvote count in full response", downvoteCount, 2);
}
