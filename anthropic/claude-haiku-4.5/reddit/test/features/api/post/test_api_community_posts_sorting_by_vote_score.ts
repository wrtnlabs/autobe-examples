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
import type { IPageICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformPost";

export async function test_api_community_posts_sorting_by_vote_score(
  connection: api.IConnection,
) {
  // Step 1: Create administrator account
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(12);
  const admin: ICommunityPlatformAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        username: RandomGenerator.name(1),
        name: RandomGenerator.name(),
        href: "http://localhost:3000/admin/join",
        referrer: "http://localhost:3000/",
      } satisfies ICommunityPlatformAdministrator.ICreate,
    });
  typia.assert(admin);

  // Step 2: Create category
  const category: ICommunityPlatformCategory =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      {
        body: {
          name: "Technology",
          slug: "technology",
          display_order: 0,
          description: "Technology discussions",
        } satisfies ICommunityPlatformCategory.ICreate,
      },
    );
  typia.assert(category);

  // Step 3: Create member accounts for voting
  const memberCredentials: { email: string; password: string }[] = [];
  const members: ICommunityPlatformMember.IAuthorized[] = [];

  for (let i = 0; i < 5; i++) {
    const memberEmail = typia.random<string & tags.Format<"email">>();
    const memberPassword = RandomGenerator.alphaNumeric(12);
    memberCredentials.push({ email: memberEmail, password: memberPassword });

    const member: ICommunityPlatformMember.IAuthorized =
      await api.functional.auth.member.join(connection, {
        body: {
          email: memberEmail,
          username: RandomGenerator.name(1),
          password: memberPassword,
          href: "http://localhost:3000/join",
          referrer: "http://localhost:3000/",
        } satisfies ICommunityPlatformMember.ICreate,
      });
    typia.assert(member);
    members.push(member);
  }

  // Switch to first member account
  await api.functional.auth.member.login(connection, {
    body: {
      email: memberCredentials[0].email,
      password: memberCredentials[0].password,
      href: "http://localhost:3000/login",
      referrer: "http://localhost:3000/",
    } satisfies ICommunityPlatformMember.ILogin,
  });

  // Step 4: Create community
  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: "Technology Discussion",
          identifier: "tech_discussion",
          description: "A community for technology discussions",
          visibility: "public",
          post_creation_restriction: "open_to_all",
          post_type_restriction: "all_types",
          category_slug: category.slug,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  // Step 5: Create posts with different vote scores
  const postIds: string[] = [];

  // Create 5 posts that will have different vote scores
  for (let i = 0; i < 5; i++) {
    const post: ICommunityPlatformPost =
      await api.functional.communityPlatform.member.posts.create(connection, {
        body: {
          community_id: community.id,
          post_type: "text",
          title: `Post ${i + 1}`,
          content_text: `Content for post ${i + 1}`,
        } satisfies ICommunityPlatformPost.ICreate,
      });
    typia.assert(post);
    postIds.push(post.id);
  }

  // Step 6: Vote on posts to create different vote scores
  // Post 0: 4 upvotes (score = 4)
  for (let j = 1; j <= 4; j++) {
    await api.functional.auth.member.login(connection, {
      body: {
        email: memberCredentials[j].email,
        password: memberCredentials[j].password,
        href: "http://localhost:3000/login",
        referrer: "http://localhost:3000/",
      } satisfies ICommunityPlatformMember.ILogin,
    });

    const vote: ICommunityPlatformVote =
      await api.functional.communityPlatform.member.votes.create(connection, {
        body: {
          content_type: "post",
          content_id: postIds[0],
          vote_type: "upvote",
        } satisfies ICommunityPlatformVote.ICreate,
      });
    typia.assert(vote);
  }

  // Post 1: 2 upvotes (score = 2)
  for (let j = 1; j <= 2; j++) {
    await api.functional.auth.member.login(connection, {
      body: {
        email: memberCredentials[j].email,
        password: memberCredentials[j].password,
        href: "http://localhost:3000/login",
        referrer: "http://localhost:3000/",
      } satisfies ICommunityPlatformMember.ILogin,
    });

    const vote: ICommunityPlatformVote =
      await api.functional.communityPlatform.member.votes.create(connection, {
        body: {
          content_type: "post",
          content_id: postIds[1],
          vote_type: "upvote",
        } satisfies ICommunityPlatformVote.ICreate,
      });
    typia.assert(vote);
  }

  // Post 2: 6 upvotes (score = 6)
  for (let j = 0; j <= 4; j++) {
    if (j < 5) {
      await api.functional.auth.member.login(connection, {
        body: {
          email: memberCredentials[j].email,
          password: memberCredentials[j].password,
          href: "http://localhost:3000/login",
          referrer: "http://localhost:3000/",
        } satisfies ICommunityPlatformMember.ILogin,
      });

      const vote: ICommunityPlatformVote =
        await api.functional.communityPlatform.member.votes.create(connection, {
          body: {
            content_type: "post",
            content_id: postIds[2],
            vote_type: "upvote",
          } satisfies ICommunityPlatformVote.ICreate,
        });
      typia.assert(vote);
    }
  }

  // Post 3: 1 upvote (score = 1)
  await api.functional.auth.member.login(connection, {
    body: {
      email: memberCredentials[1].email,
      password: memberCredentials[1].password,
      href: "http://localhost:3000/login",
      referrer: "http://localhost:3000/",
    } satisfies ICommunityPlatformMember.ILogin,
  });

  const vote3: ICommunityPlatformVote =
    await api.functional.communityPlatform.member.votes.create(connection, {
      body: {
        content_type: "post",
        content_id: postIds[3],
        vote_type: "upvote",
      } satisfies ICommunityPlatformVote.ICreate,
    });
  typia.assert(vote3);

  // Post 4: 0 votes (score = 0) - no votes needed

  // Step 7: Test descending sort (highest votes first)
  const descSortResult: IPageICommunityPlatformPost.ISummary =
    await api.functional.communityPlatform.communities.posts.index(connection, {
      communityId: community.id,
      body: {
        page: 1,
        limit: 100,
        sort_by: "voteScore",
        sort_order: "desc",
      } satisfies ICommunityPlatformPost.IRequest,
    });
  typia.assert(descSortResult);

  // Validate descending order: 6, 4, 2, 1, 0
  const descVoteScores = descSortResult.data.map((p) => p.vote_score);
  TestValidator.predicate(
    "descending vote scores should be in correct order",
    descVoteScores[0] >= descVoteScores[1] &&
      descVoteScores[1] >= descVoteScores[2] &&
      descVoteScores[2] >= descVoteScores[3] &&
      descVoteScores[3] >= descVoteScores[4],
  );

  TestValidator.equals("highest vote score should be 6", descVoteScores[0], 6);
  TestValidator.equals("lowest vote score should be 0", descVoteScores[4], 0);

  // Step 8: Test ascending sort (lowest votes first)
  const ascSortResult: IPageICommunityPlatformPost.ISummary =
    await api.functional.communityPlatform.communities.posts.index(connection, {
      communityId: community.id,
      body: {
        page: 1,
        limit: 100,
        sort_by: "voteScore",
        sort_order: "asc",
      } satisfies ICommunityPlatformPost.IRequest,
    });
  typia.assert(ascSortResult);

  // Validate ascending order: 0, 1, 2, 4, 6
  const ascVoteScores = ascSortResult.data.map((p) => p.vote_score);
  TestValidator.predicate(
    "ascending vote scores should be in correct order",
    ascVoteScores[0] <= ascVoteScores[1] &&
      ascVoteScores[1] <= ascVoteScores[2] &&
      ascVoteScores[2] <= ascVoteScores[3] &&
      ascVoteScores[3] <= ascVoteScores[4],
  );

  TestValidator.equals(
    "lowest vote score in ascending sort should be 0",
    ascVoteScores[0],
    0,
  );
  TestValidator.equals(
    "highest vote score in ascending sort should be 6",
    ascVoteScores[4],
    6,
  );

  // Step 9: Verify the post counts match
  TestValidator.equals(
    "all posts should be present in descending results",
    descSortResult.data.length,
    5,
  );
  TestValidator.equals(
    "all posts should be present in ascending results",
    ascSortResult.data.length,
    5,
  );
}
