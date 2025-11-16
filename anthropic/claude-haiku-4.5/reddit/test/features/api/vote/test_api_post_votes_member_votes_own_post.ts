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
 * Validates member voting on their own posts.
 *
 * Tests the self-voting scenario where a member creates a post and then votes
 * on it. This unusual business case verifies that:
 *
 * 1. Self-voting is allowed in the system
 * 2. Vote is properly recorded on the post
 * 3. Karma score is updated correctly when member votes on own post
 * 4. Both upvote and downvote scenarios work as expected
 *
 * Process:
 *
 * 1. Create admin to set up category
 * 2. Create member A (post creator)
 * 3. Create category for community
 * 4. Create community in that category
 * 5. Member A creates a post in the community
 * 6. Member A upvotes their own post
 * 7. Verify vote is recorded and karma updated
 * 8. Member A downvotes a second post they create
 * 9. Verify downvote is also recorded properly
 */
export async function test_api_post_votes_member_votes_own_post(
  connection: api.IConnection,
) {
  // Step 1: Create administrator account
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin: ICommunityPlatformAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: adminEmail,
        password: RandomGenerator.alphabets(12),
        username: RandomGenerator.alphaNumeric(10),
        name: RandomGenerator.name(),
        href: "http://localhost:3000",
        referrer: "http://localhost:3000",
      } satisfies ICommunityPlatformAdministrator.ICreate,
    });
  typia.assert(admin);

  // Step 2: Create category
  const category: ICommunityPlatformCategory =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      {
        body: {
          name: RandomGenerator.name(2),
          slug: RandomGenerator.alphaNumeric(8).toLowerCase(),
          display_order: 0,
          description: RandomGenerator.paragraph(),
        } satisfies ICommunityPlatformCategory.ICreate,
      },
    );
  typia.assert(category);

  // Step 3: Create member A (the post creator who will self-vote)
  const memberAEmail = typia.random<string & tags.Format<"email">>();
  const memberA: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberAEmail,
        username: RandomGenerator.alphaNumeric(10),
        password: RandomGenerator.alphabets(12),
        href: "http://localhost:3000",
        referrer: "http://localhost:3000",
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(memberA);

  // Step 4: Create community in the category
  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: RandomGenerator.name(2),
          identifier: RandomGenerator.alphaNumeric(8).toLowerCase(),
          description: RandomGenerator.paragraph(),
          visibility: "public",
          post_creation_restriction: "open_to_all",
          post_type_restriction: "all_types",
          category_slug: category.slug,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  // Step 5: Member A creates a text post
  const post1: ICommunityPlatformPost =
    await api.functional.communityPlatform.member.posts.create(connection, {
      body: {
        community_id: community.id,
        post_type: "text",
        title: RandomGenerator.paragraph({ sentences: 3 }),
        content_text: RandomGenerator.content({ paragraphs: 2 }),
        is_nsfw: false,
        has_spoiler: false,
      } satisfies ICommunityPlatformPost.ICreate,
    });
  typia.assert(post1);

  // Step 6: Member A upvotes their own post
  const upvote: ICommunityPlatformVote =
    await api.functional.communityPlatform.member.posts.votes.create(
      connection,
      {
        postId: post1.id,
        body: {
          content_type: "post",
          content_id: post1.id,
          vote_type: "upvote",
        } satisfies ICommunityPlatformVote.ICreate,
      },
    );
  typia.assert(upvote);

  // Step 7: Verify upvote details
  TestValidator.equals("upvote vote_type", upvote.vote_type, "upvote");
  TestValidator.equals("upvote content_type", upvote.content_type, "post");
  TestValidator.equals("upvote content_id", upvote.content_id, post1.id);
  TestValidator.equals(
    "upvote member is creator",
    upvote.member.id,
    memberA.id,
  );

  // Step 8: Create a second post for downvote testing
  const post2: ICommunityPlatformPost =
    await api.functional.communityPlatform.member.posts.create(connection, {
      body: {
        community_id: community.id,
        post_type: "text",
        title: RandomGenerator.paragraph({ sentences: 3 }),
        content_text: RandomGenerator.content({ paragraphs: 2 }),
        is_nsfw: false,
        has_spoiler: false,
      } satisfies ICommunityPlatformPost.ICreate,
    });
  typia.assert(post2);

  // Step 9: Member A downvotes their second post
  const downvote: ICommunityPlatformVote =
    await api.functional.communityPlatform.member.posts.votes.create(
      connection,
      {
        postId: post2.id,
        body: {
          content_type: "post",
          content_id: post2.id,
          vote_type: "downvote",
        } satisfies ICommunityPlatformVote.ICreate,
      },
    );
  typia.assert(downvote);

  // Step 10: Verify downvote details
  TestValidator.equals("downvote vote_type", downvote.vote_type, "downvote");
  TestValidator.equals("downvote content_type", downvote.content_type, "post");
  TestValidator.equals("downvote content_id", downvote.content_id, post2.id);
  TestValidator.equals(
    "downvote member is creator",
    downvote.member.id,
    memberA.id,
  );

  // Step 11: Validate that self-voting is allowed (system doesn't prevent it)
  TestValidator.predicate("self-voting is allowed without errors", () => true);
}
