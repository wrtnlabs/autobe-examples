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
 * Test moderator combined filtering of voting records.
 *
 * Validates that moderators can retrieve voting records with multiple filters
 * applied simultaneously. This test creates test data including moderator and
 * member accounts, a community with posts, and various votes. It then retrieves
 * voting records using combined filters (member_id AND vote_type AND
 * content_type) to verify that the API correctly applies AND logic to all
 * filter parameters and returns only records matching all criteria.
 *
 * Test workflow:
 *
 * 1. Create moderator account for voting record retrieval
 * 2. Create member accounts for casting votes
 * 3. Create community for content
 * 4. Create posts in the community
 * 5. Cast votes with different vote types and content types
 * 6. Retrieve voting records with combined filters
 * 7. Validate that results match all filter criteria
 * 8. Test multiple filter combinations
 */
export async function test_api_voting_records_moderator_combined_filters(
  connection: api.IConnection,
) {
  // 1. Create moderator account
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorPassword = RandomGenerator.alphaNumeric(12);
  const moderator: ICommunityPlatformModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        username: RandomGenerator.alphabets(8),
        password: moderatorPassword,
        href: "https://example.com",
        referrer: "https://example.com",
      } satisfies ICommunityPlatformModerator.ICreate,
    });
  typia.assert(moderator);

  // 2. Create multiple member accounts for casting votes
  const member1Email = typia.random<string & tags.Format<"email">>();
  const member1Password = RandomGenerator.alphaNumeric(12);
  const member1: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: member1Email,
        username: RandomGenerator.alphabets(8),
        password: member1Password,
        href: "https://example.com",
        referrer: "https://example.com",
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(member1);

  const member2Email = typia.random<string & tags.Format<"email">>();
  const member2Password = RandomGenerator.alphaNumeric(12);
  const member2: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: member2Email,
        username: RandomGenerator.alphabets(8),
        password: member2Password,
        href: "https://example.com",
        referrer: "https://example.com",
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(member2);

  // 3. Create community
  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: RandomGenerator.name(2),
          identifier: RandomGenerator.alphabets(10),
          description: RandomGenerator.paragraph(),
          visibility: "public",
          post_creation_restriction: "open_to_all",
          post_type_restriction: "all_types",
          category_slug: "technology",
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  // 4. Create posts for votes
  const post1: ICommunityPlatformPost =
    await api.functional.communityPlatform.member.posts.create(connection, {
      body: {
        community_id: community.id,
        post_type: "text",
        title: RandomGenerator.name(3),
        content_text: RandomGenerator.paragraph(),
      } satisfies ICommunityPlatformPost.ICreate,
    });
  typia.assert(post1);

  const post2: ICommunityPlatformPost =
    await api.functional.communityPlatform.member.posts.create(connection, {
      body: {
        community_id: community.id,
        post_type: "text",
        title: RandomGenerator.name(3),
        content_text: RandomGenerator.paragraph(),
      } satisfies ICommunityPlatformPost.ICreate,
    });
  typia.assert(post2);

  // 5. Cast votes with different vote types (member1 is already authenticated)
  // Member 1 upvotes post1
  const vote1: ICommunityPlatformVote =
    await api.functional.communityPlatform.member.votes.create(connection, {
      body: {
        content_type: "post",
        content_id: post1.id,
        vote_type: "upvote",
      } satisfies ICommunityPlatformVote.ICreate,
    });
  typia.assert(vote1);

  // Member 1 downvotes post2
  const vote2: ICommunityPlatformVote =
    await api.functional.communityPlatform.member.votes.create(connection, {
      body: {
        content_type: "post",
        content_id: post2.id,
        vote_type: "downvote",
      } satisfies ICommunityPlatformVote.ICreate,
    });
  typia.assert(vote2);

  // Switch to member2 and cast votes
  await api.functional.auth.member.login(connection, {
    body: {
      email: member2Email,
      password: member2Password,
      href: "https://example.com",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformMember.ILogin,
  });

  // Member 2 upvotes post1
  const vote3: ICommunityPlatformVote =
    await api.functional.communityPlatform.member.votes.create(connection, {
      body: {
        content_type: "post",
        content_id: post1.id,
        vote_type: "upvote",
      } satisfies ICommunityPlatformVote.ICreate,
    });
  typia.assert(vote3);

  // Member 2 upvotes post2
  const vote4: ICommunityPlatformVote =
    await api.functional.communityPlatform.member.votes.create(connection, {
      body: {
        content_type: "post",
        content_id: post2.id,
        vote_type: "upvote",
      } satisfies ICommunityPlatformVote.ICreate,
    });
  typia.assert(vote4);

  // 6. Switch to moderator and retrieve voting records with combined filters
  await api.functional.auth.moderator.login(connection, {
    body: {
      email: moderatorEmail,
      password: moderatorPassword,
      href: "https://example.com",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformModerator.ILogin,
  });

  // Test 1: Filter by member_id AND vote_type (upvote)
  const result1: IPageICommunityPlatformVote =
    await api.functional.communityPlatform.moderator.votes.index(connection, {
      body: {
        member_id: member1.id,
        vote_type: "upvote",
      } satisfies ICommunityPlatformVote.IRequest,
    });
  typia.assert(result1);
  TestValidator.predicate(
    "member1 upvotes should be retrieved",
    result1.data.length > 0,
  );
  TestValidator.predicate(
    "all results should match member_id filter",
    result1.data.every((v) => v.community_platform_member_id === member1.id),
  );
  TestValidator.predicate(
    "all results should match vote_type filter (upvote)",
    result1.data.every((v) => v.vote_type === "upvote"),
  );

  // Test 2: Filter by member_id AND vote_type (downvote)
  const result2: IPageICommunityPlatformVote =
    await api.functional.communityPlatform.moderator.votes.index(connection, {
      body: {
        member_id: member1.id,
        vote_type: "downvote",
      } satisfies ICommunityPlatformVote.IRequest,
    });
  typia.assert(result2);
  TestValidator.predicate(
    "member1 downvotes should be retrieved",
    result2.data.length > 0,
  );
  TestValidator.predicate(
    "all results should match member_id filter",
    result2.data.every((v) => v.community_platform_member_id === member1.id),
  );
  TestValidator.predicate(
    "all results should match vote_type filter (downvote)",
    result2.data.every((v) => v.vote_type === "downvote"),
  );

  // Test 3: Filter by member_id AND content_type AND vote_type
  const result3: IPageICommunityPlatformVote =
    await api.functional.communityPlatform.moderator.votes.index(connection, {
      body: {
        member_id: member1.id,
        content_type: "post",
        vote_type: "upvote",
      } satisfies ICommunityPlatformVote.IRequest,
    });
  typia.assert(result3);
  TestValidator.predicate(
    "combined filters should restrict results",
    result3.data.length > 0,
  );
  TestValidator.predicate(
    "all results should match member_id filter",
    result3.data.every((v) => v.community_platform_member_id === member1.id),
  );
  TestValidator.predicate(
    "all results should match content_type filter",
    result3.data.every((v) => v.content_type === "post"),
  );
  TestValidator.predicate(
    "all results should match vote_type filter",
    result3.data.every((v) => v.vote_type === "upvote"),
  );

  // Test 4: Filter by different member_id with combined criteria
  const result4: IPageICommunityPlatformVote =
    await api.functional.communityPlatform.moderator.votes.index(connection, {
      body: {
        member_id: member2.id,
        vote_type: "upvote",
      } satisfies ICommunityPlatformVote.IRequest,
    });
  typia.assert(result4);
  TestValidator.predicate(
    "member2 upvotes should be retrieved",
    result4.data.length > 0,
  );
  TestValidator.predicate(
    "all results should match member_id filter",
    result4.data.every((v) => v.community_platform_member_id === member2.id),
  );
  TestValidator.predicate(
    "all results should match vote_type filter",
    result4.data.every((v) => v.vote_type === "upvote"),
  );

  // Test 5: Verify that filters work as AND logic (not OR)
  TestValidator.notEquals(
    "different member filters should return different results",
    result1.data[0]?.id,
    result4.data[0]?.id,
  );

  // Test 6: Filter by content_type alone
  const result5: IPageICommunityPlatformVote =
    await api.functional.communityPlatform.moderator.votes.index(connection, {
      body: {
        content_type: "post",
      } satisfies ICommunityPlatformVote.IRequest,
    });
  typia.assert(result5);
  TestValidator.predicate(
    "content_type filter should return post votes",
    result5.data.every((v) => v.content_type === "post"),
  );
  TestValidator.predicate(
    "all created votes should be post type and included",
    result5.data.length >= 4,
  );
}
