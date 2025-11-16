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

export async function test_api_community_posts_filter_by_vote_score_range(
  connection: api.IConnection,
) {
  // 1. Setup: Create administrator account
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin: ICommunityPlatformAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: adminEmail,
        password: "AdminPassword123",
        username: RandomGenerator.alphaNumeric(8),
        name: RandomGenerator.name(),
        href: "http://localhost:3000/admin/setup",
        referrer: "http://localhost:3000",
      } satisfies ICommunityPlatformAdministrator.ICreate,
    });
  typia.assert(admin);

  // 2. Create category
  const category: ICommunityPlatformCategory =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      {
        body: {
          name: "Technology",
          slug: `tech_${RandomGenerator.alphaNumeric(6)}`,
          description: "Technology discussions",
          display_order: 1,
        } satisfies ICommunityPlatformCategory.ICreate,
      },
    );
  typia.assert(category);

  // 3. Create multiple member accounts for voting and posting
  const memberEmails = [
    "member1@test.com",
    "member2@test.com",
    "member3@test.com",
    "member4@test.com",
    "member5@test.com",
  ];
  const members: ICommunityPlatformMember.IAuthorized[] = [];

  for (const email of memberEmails) {
    const member: ICommunityPlatformMember.IAuthorized =
      await api.functional.auth.member.join(connection, {
        body: {
          email: email,
          username: `user_${RandomGenerator.alphaNumeric(6)}`,
          password: "UserPassword123",
          href: "http://localhost:3000/register",
          referrer: "http://localhost:3000",
        } satisfies ICommunityPlatformMember.ICreate,
      });
    typia.assert(member);
    members.push(member);
  }

  // 4. Create a community
  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: "Tech Discussions",
          identifier: `tech_${RandomGenerator.alphaNumeric(6)}`,
          description: "Community for tech discussions",
          visibility: "public",
          post_creation_restriction: "open_to_all",
          post_type_restriction: "all_types",
          category_slug: category.slug,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  // 5. Create posts with varying vote scores
  const posts: ICommunityPlatformPost[] = [];

  for (let i = 0; i < 3; i++) {
    const post: ICommunityPlatformPost =
      await api.functional.communityPlatform.member.posts.create(connection, {
        body: {
          community_id: community.id,
          post_type: "text",
          title: `Post ${i + 1}: Vote Score Test`,
          content_text: `This is test post ${i + 1} for vote score filtering`,
        } satisfies ICommunityPlatformPost.ICreate,
      });
    typia.assert(post);
    posts.push(post);
  }

  // 6. Cast votes to achieve different vote scores
  // Post 0: 5 upvotes = vote_score 5 (low range)
  for (let j = 0; j < 5; j++) {
    const memberIndex = j % memberEmails.length;
    await api.functional.auth.member.login(connection, {
      body: {
        email: memberEmails[memberIndex],
        password: "UserPassword123",
        href: "http://localhost:3000/login",
        referrer: "http://localhost:3000",
      } satisfies ICommunityPlatformMember.ILogin,
    });

    const vote0: ICommunityPlatformVote =
      await api.functional.communityPlatform.member.votes.create(connection, {
        body: {
          content_type: "post",
          content_id: posts[0].id,
          vote_type: "upvote",
        } satisfies ICommunityPlatformVote.ICreate,
      });
    typia.assert(vote0);
  }

  // Post 1: 20 upvotes = vote_score 20 (medium range)
  for (let j = 0; j < 20; j++) {
    const memberIndex = j % memberEmails.length;
    await api.functional.auth.member.login(connection, {
      body: {
        email: memberEmails[memberIndex],
        password: "UserPassword123",
        href: "http://localhost:3000/login",
        referrer: "http://localhost:3000",
      } satisfies ICommunityPlatformMember.ILogin,
    });

    const vote1: ICommunityPlatformVote =
      await api.functional.communityPlatform.member.votes.create(connection, {
        body: {
          content_type: "post",
          content_id: posts[1].id,
          vote_type: "upvote",
        } satisfies ICommunityPlatformVote.ICreate,
      });
    typia.assert(vote1);
  }

  // Post 2: 60 upvotes = vote_score 60 (high range)
  for (let j = 0; j < 60; j++) {
    const memberIndex = j % memberEmails.length;
    await api.functional.auth.member.login(connection, {
      body: {
        email: memberEmails[memberIndex],
        password: "UserPassword123",
        href: "http://localhost:3000/login",
        referrer: "http://localhost:3000",
      } satisfies ICommunityPlatformMember.ILogin,
    });

    const vote2: ICommunityPlatformVote =
      await api.functional.communityPlatform.member.votes.create(connection, {
        body: {
          content_type: "post",
          content_id: posts[2].id,
          vote_type: "upvote",
        } satisfies ICommunityPlatformVote.ICreate,
      });
    typia.assert(vote2);
  }

  // Login as first member for filtering tests
  await api.functional.auth.member.login(connection, {
    body: {
      email: memberEmails[0],
      password: "UserPassword123",
      href: "http://localhost:3000/login",
      referrer: "http://localhost:3000",
    } satisfies ICommunityPlatformMember.ILogin,
  });

  // 7. Test filtering scenarios
  // Test 1: Filter low range (0-10)
  const lowRangeResult: IPageICommunityPlatformPost.ISummary =
    await api.functional.communityPlatform.communities.posts.index(connection, {
      communityId: community.id,
      body: {
        page: 1,
        limit: 10,
        min_vote_score: 0,
        max_vote_score: 10,
      } satisfies ICommunityPlatformPost.IRequest,
    });
  typia.assert(lowRangeResult);
  TestValidator.predicate(
    "low range should contain post 0",
    lowRangeResult.data.some((p) => p.id === posts[0].id),
  );
  TestValidator.predicate(
    "low range should not contain post 1",
    !lowRangeResult.data.some((p) => p.id === posts[1].id),
  );
  TestValidator.predicate(
    "low range should not contain post 2",
    !lowRangeResult.data.some((p) => p.id === posts[2].id),
  );

  // Test 2: Filter medium range (10-50)
  const mediumRangeResult: IPageICommunityPlatformPost.ISummary =
    await api.functional.communityPlatform.communities.posts.index(connection, {
      communityId: community.id,
      body: {
        page: 1,
        limit: 10,
        min_vote_score: 10,
        max_vote_score: 50,
      } satisfies ICommunityPlatformPost.IRequest,
    });
  typia.assert(mediumRangeResult);
  TestValidator.predicate(
    "medium range should contain post 1",
    mediumRangeResult.data.some((p) => p.id === posts[1].id),
  );
  TestValidator.predicate(
    "medium range should not contain post 0",
    !mediumRangeResult.data.some((p) => p.id === posts[0].id),
  );
  TestValidator.predicate(
    "medium range should not contain post 2",
    !mediumRangeResult.data.some((p) => p.id === posts[2].id),
  );

  // Test 3: Filter high range (50+)
  const highRangeResult: IPageICommunityPlatformPost.ISummary =
    await api.functional.communityPlatform.communities.posts.index(connection, {
      communityId: community.id,
      body: {
        page: 1,
        limit: 10,
        min_vote_score: 50,
      } satisfies ICommunityPlatformPost.IRequest,
    });
  typia.assert(highRangeResult);
  TestValidator.predicate(
    "high range should contain post 2",
    highRangeResult.data.some((p) => p.id === posts[2].id),
  );
  TestValidator.predicate(
    "high range should not contain post 0",
    !highRangeResult.data.some((p) => p.id === posts[0].id),
  );
  TestValidator.predicate(
    "high range should not contain post 1",
    !highRangeResult.data.some((p) => p.id === posts[1].id),
  );

  // Test 4: Boundary condition - exact value match
  const exactMinResult: IPageICommunityPlatformPost.ISummary =
    await api.functional.communityPlatform.communities.posts.index(connection, {
      communityId: community.id,
      body: {
        page: 1,
        limit: 10,
        min_vote_score: 5,
        max_vote_score: 5,
      } satisfies ICommunityPlatformPost.IRequest,
    });
  typia.assert(exactMinResult);
  TestValidator.predicate(
    "exact match (5) should contain post 0",
    exactMinResult.data.some((p) => p.id === posts[0].id),
  );

  // Test 5: No results when range doesn't match
  const noResultsRange: IPageICommunityPlatformPost.ISummary =
    await api.functional.communityPlatform.communities.posts.index(connection, {
      communityId: community.id,
      body: {
        page: 1,
        limit: 10,
        min_vote_score: 30,
        max_vote_score: 40,
      } satisfies ICommunityPlatformPost.IRequest,
    });
  typia.assert(noResultsRange);
  TestValidator.equals(
    "no results in range 30-40",
    noResultsRange.data.length,
    0,
  );
}
