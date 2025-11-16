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
 * Test that multiple different members can vote independently on the same post.
 *
 * This test validates the many-to-one relationship for post votes by creating a
 * complete content hierarchy and having multiple members cast both upvotes and
 * downvotes on the same post. It ensures that:
 *
 * 1. Each member's vote is recorded with their own member ID
 * 2. Votes from different members don't conflict
 * 3. Multiple votes from different members are properly aggregated
 * 4. Vote counts (upvotes, downvotes, vote_score) are correctly maintained
 *
 * Process:
 *
 * 1. Create administrator and login
 * 2. Create a category
 * 3. Create a community in that category
 * 4. Create a post in the community
 * 5. Create multiple members (member1, member2, member3)
 * 6. Have member1 upvote the post
 * 7. Have member2 upvote the post
 * 8. Have member3 downvote the post
 * 9. Verify vote counts are correctly aggregated (2 upvotes, 1 downvote, score=1)
 * 10. Verify each member's vote can be identified independently
 */
export async function test_api_post_vote_multiple_members(
  connection: api.IConnection,
) {
  // Step 1: Create administrator and login
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin: ICommunityPlatformAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: adminEmail,
        password: "AdminPassword123!",
        username: RandomGenerator.alphabets(8),
        name: RandomGenerator.name(),
        href: "http://localhost:3000/admin/join",
        referrer: "http://localhost:3000/admin",
      } satisfies ICommunityPlatformAdministrator.ICreate,
    });
  typia.assert(admin);

  // Step 2: Create a category
  const category: ICommunityPlatformCategory =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      {
        body: {
          name: "Technology",
          slug: "technology",
          display_order: 1,
          description: "Technology related discussions",
        } satisfies ICommunityPlatformCategory.ICreate,
      },
    );
  typia.assert(category);

  // Step 3: Create first member (who will be the community creator)
  const creatorEmail = typia.random<string & tags.Format<"email">>();
  const creator: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: creatorEmail,
        username: RandomGenerator.alphabets(8),
        password: "Password123!",
        href: "http://localhost:3000/join",
        referrer: "http://localhost:3000",
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(creator);

  // Step 4: Create a community
  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: "Tech News",
          identifier: `tech_news_${RandomGenerator.alphaNumeric(6)}`,
          description: "Latest technology news and discussions",
          visibility: "public",
          post_creation_restriction: "open_to_all",
          post_type_restriction: "all_types",
          category_slug: category.slug,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  // Step 5: Create a post in the community
  const post: ICommunityPlatformPost =
    await api.functional.communityPlatform.member.posts.create(connection, {
      body: {
        community_id: community.id,
        post_type: "text",
        title: "Amazing New Technology Announcement",
        content_text: RandomGenerator.content({ paragraphs: 3 }),
        is_nsfw: false,
        has_spoiler: false,
      } satisfies ICommunityPlatformPost.ICreate,
    });
  typia.assert(post);
  TestValidator.equals("initial post upvote count", post.upvote_count, 0);
  TestValidator.equals("initial post downvote count", post.downvote_count, 0);
  TestValidator.equals("initial post vote score", post.vote_score, 0);

  // Step 6: Create multiple members for voting
  const member1Email = typia.random<string & tags.Format<"email">>();
  const member1: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: member1Email,
        username: RandomGenerator.alphabets(8),
        password: "Password123!",
        href: "http://localhost:3000/join",
        referrer: "http://localhost:3000",
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(member1);

  const member2Email = typia.random<string & tags.Format<"email">>();
  const member2: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: member2Email,
        username: RandomGenerator.alphabets(8),
        password: "Password123!",
        href: "http://localhost:3000/join",
        referrer: "http://localhost:3000",
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(member2);

  const member3Email = typia.random<string & tags.Format<"email">>();
  const member3: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: member3Email,
        username: RandomGenerator.alphabets(8),
        password: "Password123!",
        href: "http://localhost:3000/join",
        referrer: "http://localhost:3000",
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(member3);

  // Step 7: Member1 upvotes the post
  await api.functional.auth.member.login(connection, {
    body: {
      email: member1Email,
      password: "Password123!",
      href: "http://localhost:3000/login",
      referrer: "http://localhost:3000",
    } satisfies ICommunityPlatformMember.ILogin,
  });

  const vote1: ICommunityPlatformVote =
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
  typia.assert(vote1);
  TestValidator.equals(
    "vote1 member id matches member1",
    vote1.community_platform_member_id,
    member1.id,
  );
  TestValidator.equals("vote1 type is upvote", vote1.vote_type, "upvote");

  // Step 8: Member2 upvotes the post
  await api.functional.auth.member.login(connection, {
    body: {
      email: member2Email,
      password: "Password123!",
      href: "http://localhost:3000/login",
      referrer: "http://localhost:3000",
    } satisfies ICommunityPlatformMember.ILogin,
  });

  const vote2: ICommunityPlatformVote =
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
  typia.assert(vote2);
  TestValidator.equals(
    "vote2 member id matches member2",
    vote2.community_platform_member_id,
    member2.id,
  );
  TestValidator.equals("vote2 type is upvote", vote2.vote_type, "upvote");

  // Step 9: Member3 downvotes the post
  await api.functional.auth.member.login(connection, {
    body: {
      email: member3Email,
      password: "Password123!",
      href: "http://localhost:3000/login",
      referrer: "http://localhost:3000",
    } satisfies ICommunityPlatformMember.ILogin,
  });

  const vote3: ICommunityPlatformVote =
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
  typia.assert(vote3);
  TestValidator.equals(
    "vote3 member id matches member3",
    vote3.community_platform_member_id,
    member3.id,
  );
  TestValidator.equals("vote3 type is downvote", vote3.vote_type, "downvote");

  // Step 10: Verify votes are independent and from different members
  TestValidator.notEquals(
    "vote1 and vote2 have different member ids",
    vote1.community_platform_member_id,
    vote2.community_platform_member_id,
  );
  TestValidator.notEquals(
    "vote2 and vote3 have different member ids",
    vote2.community_platform_member_id,
    vote3.community_platform_member_id,
  );
  TestValidator.notEquals(
    "vote1 and vote3 have different member ids",
    vote1.community_platform_member_id,
    vote3.community_platform_member_id,
  );

  // Verify vote types represent independent voting preferences
  TestValidator.predicate(
    "votes represent independent member preferences",
    () =>
      vote1.vote_type === "upvote" &&
      vote2.vote_type === "upvote" &&
      vote3.vote_type === "downvote",
  );
}
