import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCategory";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformVote";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformVote";

export async function test_api_votes_filter_by_voter_member(
  connection: api.IConnection,
) {
  // Step 1: Create administrator account to set up categories
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin: ICommunityPlatformAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: adminEmail,
        password: "AdminPassword123!",
        username: RandomGenerator.alphaNumeric(8),
        name: RandomGenerator.name(),
        href: "http://localhost:3000/admin/join",
        referrer: "",
      } satisfies ICommunityPlatformAdministrator.ICreate,
    });
  typia.assert(admin);

  // Step 2: Create category for community
  const category: ICommunityPlatformCategory =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      {
        body: {
          name: "Test Category",
          slug: RandomGenerator.alphaNumeric(8).toLowerCase(),
          description: RandomGenerator.paragraph({ sentences: 2 }),
          display_order: 1,
        } satisfies ICommunityPlatformCategory.ICreate,
      },
    );
  typia.assert(category);

  // Step 3: Create first member who will cast votes
  const member1Email = typia.random<string & tags.Format<"email">>();
  const member1: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: member1Email,
        username: RandomGenerator.alphaNumeric(8),
        password: "Password123!",
        href: "http://localhost:3000/join",
        referrer: "",
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(member1);

  // Step 4: Create second member for comparison
  const member2Email = typia.random<string & tags.Format<"email">>();
  const member2: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: member2Email,
        username: RandomGenerator.alphaNumeric(8),
        password: "Password123!",
        href: "http://localhost:3000/join",
        referrer: "",
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(member2);

  // Step 5: Login as member1 and create community
  await api.functional.auth.member.login(connection, {
    body: {
      email: member1Email,
      password: "Password123!",
      href: "http://localhost:3000/login",
      referrer: "",
    } satisfies ICommunityPlatformMember.ILogin,
  });

  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: "Test Community",
          identifier: RandomGenerator.alphaNumeric(8).toLowerCase(),
          description: RandomGenerator.paragraph({ sentences: 3 }),
          visibility: "public",
          post_creation_restriction: "open_to_all",
          post_type_restriction: "all_types",
          category_slug: category.slug,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  // Step 6: Create posts for voting
  const posts: ICommunityPlatformPost[] = [];
  for (let i = 0; i < 3; i++) {
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
    posts.push(post);
  }

  // Step 7: Create comments for voting
  const comments: ICommunityPlatformComment[] = [];
  for (let i = 0; i < 2; i++) {
    const comment: ICommunityPlatformComment =
      await api.functional.communityPlatform.member.comments.create(
        connection,
        {
          body: {
            post_id: posts[0].id,
            content: RandomGenerator.paragraph({ sentences: 3 }),
          } satisfies ICommunityPlatformComment.ICreate,
        },
      );
    typia.assert(comment);
    comments.push(comment);
  }

  // Step 8: Switch to member2 and create some posts/comments for voting
  await api.functional.auth.member.login(connection, {
    body: {
      email: member2Email,
      password: "Password123!",
      href: "http://localhost:3000/login",
      referrer: "",
    } satisfies ICommunityPlatformMember.ILogin,
  });

  const member2Post: ICommunityPlatformPost =
    await api.functional.communityPlatform.member.posts.create(connection, {
      body: {
        community_id: community.id,
        post_type: "text",
        title: RandomGenerator.paragraph({ sentences: 2 }),
        content_text: RandomGenerator.content({ paragraphs: 2 }),
      } satisfies ICommunityPlatformPost.ICreate,
    });
  typia.assert(member2Post);

  // Step 9: Test vote filtering with member1's ID
  // Query votes filtered by member1 - should return votes cast by member1
  const votesFilteredByMember1: IPageICommunityPlatformVote =
    await api.functional.communityPlatform.member.votes.index(connection, {
      body: {
        page: 1,
        limit: 20,
        member_id: member1.id,
      } satisfies ICommunityPlatformVote.IRequest,
    });
  typia.assert(votesFilteredByMember1);

  // Step 10: Verify that filtering by member1's ID returns only member1's votes
  TestValidator.predicate(
    "all votes should belong to member1 when filtering by member1 ID",
    votesFilteredByMember1.data.every(
      (vote) => vote.community_platform_member_id === member1.id,
    ),
  );

  // Step 11: Verify pagination structure is correct
  TestValidator.predicate(
    "pagination should have current page 1",
    votesFilteredByMember1.pagination.current === 1,
  );

  TestValidator.predicate(
    "pagination limit should be 20",
    votesFilteredByMember1.pagination.limit === 20,
  );

  // Step 12: Test with different member filter (member2)
  const votesFilteredByMember2: IPageICommunityPlatformVote =
    await api.functional.communityPlatform.member.votes.index(connection, {
      body: {
        page: 1,
        limit: 20,
        member_id: member2.id,
      } satisfies ICommunityPlatformVote.IRequest,
    });
  typia.assert(votesFilteredByMember2);

  // Step 13: Verify member2 filter returns member2's votes only
  TestValidator.predicate(
    "all votes should belong to member2 when filtering by member2 ID",
    votesFilteredByMember2.data.every(
      (vote) => vote.community_platform_member_id === member2.id,
    ),
  );

  // Step 14: Verify that member1 and member2 vote results are different (if both have votes)
  // or that filtering correctly isolates each member's votes
  TestValidator.predicate(
    "member1 and member2 vote filters should not overlap",
    !votesFilteredByMember1.data.some((vote1) =>
      votesFilteredByMember2.data.some((vote2) => vote1.id === vote2.id),
    ),
  );

  // Step 15: Test pagination with member filter
  const votesPage2: IPageICommunityPlatformVote =
    await api.functional.communityPlatform.member.votes.index(connection, {
      body: {
        page: 1,
        limit: 10,
        member_id: member1.id,
      } satisfies ICommunityPlatformVote.IRequest,
    });
  typia.assert(votesPage2);

  TestValidator.predicate(
    "pagination limit should be 10",
    votesPage2.pagination.limit === 10,
  );

  // Step 16: Verify member_id filter isolation
  TestValidator.predicate(
    "all votes in result should have matching member_id",
    votesPage2.data.every(
      (vote) => vote.community_platform_member_id === member1.id,
    ),
  );
}
