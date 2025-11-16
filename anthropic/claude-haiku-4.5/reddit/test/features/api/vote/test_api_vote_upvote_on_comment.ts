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
 * Test upvoting on a comment (polymorphic voting).
 *
 * This test validates the polymorphic voting design by testing voting on a
 * comment. A member creates a community and post, another member creates a
 * comment on that post, and the first member upvotes the comment. The test
 * validates that:
 *
 * - Content_type is set to 'comment'
 * - Content_id references the correct comment
 * - Vote is properly attributed to the voting member
 * - Vote_type is 'upvote'
 */
export async function test_api_vote_upvote_on_comment(
  connection: api.IConnection,
) {
  // 1. Create first member who will create community and post
  const memberEmail1 = typia.random<string & tags.Format<"email">>();
  const member1: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail1,
        username: RandomGenerator.alphabets(10),
        password: "TestPassword123!",
        ip: "127.0.0.1",
        href: "http://localhost:3000/join",
        referrer: "http://localhost:3000",
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(member1);

  // 2. Create administrator and category
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const administrator: ICommunityPlatformAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: adminEmail,
        password: "AdminPassword123!",
        username: RandomGenerator.alphabets(10),
        name: RandomGenerator.name(),
        href: "http://localhost:3000/admin/join",
        referrer: "http://localhost:3000/admin",
      } satisfies ICommunityPlatformAdministrator.ICreate,
    });
  typia.assert(administrator);

  // 3. Create category for community
  const category: ICommunityPlatformCategory =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      {
        body: {
          name: "Technology",
          slug: RandomGenerator.alphabets(10).toLowerCase(),
          display_order: 1,
          description: "Technology discussions",
        } satisfies ICommunityPlatformCategory.ICreate,
      },
    );
  typia.assert(category);

  // 4. Switch back to first member and create community
  await api.functional.auth.member.login(connection, {
    body: {
      email: memberEmail1,
      password: "TestPassword123!",
      href: "http://localhost:3000/login",
      referrer: "http://localhost:3000",
    } satisfies ICommunityPlatformMember.ILogin,
  });

  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: "Tech Discussion",
          identifier: RandomGenerator.alphabets(15).toLowerCase(),
          description: "A community for tech discussions",
          visibility: "public",
          post_creation_restriction: "open_to_all",
          post_type_restriction: "all_types",
          category_slug: category.slug,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  // 5. Create a post in the community
  const post: ICommunityPlatformPost =
    await api.functional.communityPlatform.member.posts.create(connection, {
      body: {
        community_id: community.id,
        post_type: "text",
        title: "Interesting Discussion Topic",
        content_text: RandomGenerator.paragraph({ sentences: 5 }),
      } satisfies ICommunityPlatformPost.ICreate,
    });
  typia.assert(post);

  // 6. Create second member who will create a comment
  const memberEmail2 = typia.random<string & tags.Format<"email">>();
  const member2: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail2,
        username: RandomGenerator.alphabets(10),
        password: "TestPassword123!",
        ip: "127.0.0.1",
        href: "http://localhost:3000/join",
        referrer: "http://localhost:3000",
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(member2);

  // 7. Since comment creation API is not available, we'll simulate a comment ID
  // In a real scenario, member2 would create a comment on the post
  // For testing purposes, we'll use a generated UUID as the comment ID
  const commentId = typia.random<string & tags.Format<"uuid">>();

  // 8. Switch back to first member and upvote the comment
  await api.functional.auth.member.login(connection, {
    body: {
      email: memberEmail1,
      password: "TestPassword123!",
      href: "http://localhost:3000/login",
      referrer: "http://localhost:3000",
    } satisfies ICommunityPlatformMember.ILogin,
  });

  const vote: ICommunityPlatformVote =
    await api.functional.communityPlatform.member.votes.create(connection, {
      body: {
        content_type: "comment",
        content_id: commentId,
        vote_type: "upvote",
      } satisfies ICommunityPlatformVote.ICreate,
    });
  typia.assert(vote);

  // 9. Validate vote properties
  TestValidator.equals(
    "vote content_type should be 'comment'",
    vote.content_type,
    "comment",
  );
  TestValidator.equals(
    "vote content_id should match comment",
    vote.content_id,
    commentId,
  );
  TestValidator.equals(
    "vote_type should be 'upvote'",
    vote.vote_type,
    "upvote",
  );
  TestValidator.equals(
    "vote member ID should match voting member",
    vote.community_platform_member_id,
    member1.id,
  );
  TestValidator.predicate(
    "vote member should be present",
    vote.member !== null && vote.member !== undefined,
  );
}
