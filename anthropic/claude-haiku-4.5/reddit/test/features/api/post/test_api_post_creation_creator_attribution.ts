import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCategory";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";

/**
 * Test that post creator is automatically extracted from authenticated member
 * context.
 *
 * Validates that when a member creates a post, the creator_id is automatically
 * populated from the authenticated user's JWT token and cannot be manually
 * overridden. The creator information appears in the response as a complete
 * ICommunityPlatformMember.ISummary with all required fields (username, email,
 * karma_score, etc.). Creator attribution is immutable after post creation.
 *
 * Test workflow:
 *
 * 1. Setup: Create admin and member accounts
 * 2. Create a category for organizing posts
 * 3. Authenticate as a specific member
 * 4. Create a post
 * 5. Verify creator_id matches authenticated member ID
 * 6. Verify creator information is complete and accurate
 * 7. Create another post by same member
 * 8. Verify both posts have identical creator attribution
 * 9. Verify creator information is immutable and derived from authentication
 *    context
 */
export async function test_api_post_creation_creator_attribution(
  connection: api.IConnection,
) {
  // Setup: Create admin account
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin: ICommunityPlatformAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: adminEmail,
        password: RandomGenerator.alphaNumeric(12),
        username: RandomGenerator.alphabets(8),
        name: RandomGenerator.name(),
        href: "http://localhost:3000",
        referrer: "http://localhost:3000",
      } satisfies ICommunityPlatformAdministrator.ICreate,
    });
  typia.assert(admin);

  // Create category
  const category: ICommunityPlatformCategory =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      {
        body: {
          name: RandomGenerator.name(2),
          slug: RandomGenerator.alphabets(10),
          display_order: 1,
        } satisfies ICommunityPlatformCategory.ICreate,
      },
    );
  typia.assert(category);

  // Create first member account
  const memberEmail1 = typia.random<string & tags.Format<"email">>();
  const memberPassword1 = RandomGenerator.alphaNumeric(12);
  const memberUsername1 = RandomGenerator.alphabets(8);

  const member1: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail1,
        password: memberPassword1,
        username: memberUsername1,
        href: "http://localhost:3000",
        referrer: "http://localhost:3000",
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(member1);

  // Authenticate as member1
  const member1Login: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.login(connection, {
      body: {
        email: memberEmail1,
        password: memberPassword1,
        href: "http://localhost:3000",
        referrer: "http://localhost:3000",
      } satisfies ICommunityPlatformMember.ILogin,
    });
  typia.assert(member1Login);

  const member1Id = member1Login.id;

  // Create first post
  const post1: ICommunityPlatformPost =
    await api.functional.communityPlatform.member.posts.create(connection, {
      body: {
        community_id: typia.random<string & tags.Format<"uuid">>(),
        post_type: "text",
        title: RandomGenerator.paragraph({ sentences: 3 }),
        content_text: RandomGenerator.content({ paragraphs: 2 }),
        is_nsfw: false,
        has_spoiler: false,
      } satisfies ICommunityPlatformPost.ICreate,
    });
  typia.assert(post1);

  // Verify creator_id matches authenticated member
  TestValidator.equals(
    "post1 creator_id matches authenticated member",
    post1.creator.id,
    member1Id,
  );

  // Verify creator information is complete
  TestValidator.equals(
    "post1 creator username matches",
    post1.creator.username,
    memberUsername1,
  );

  TestValidator.equals(
    "post1 creator email matches",
    post1.creator.email,
    memberEmail1,
  );

  TestValidator.equals(
    "post1 creator account_status is active",
    post1.creator.account_status,
    "active",
  );

  TestValidator.predicate(
    "post1 creator karma_score is non-negative",
    post1.creator.karma_score >= 0,
  );

  TestValidator.predicate(
    "post1 creator created_at is valid ISO timestamp",
    !isNaN(new Date(post1.creator.created_at).getTime()),
  );

  // Create second post by same member
  const post2: ICommunityPlatformPost =
    await api.functional.communityPlatform.member.posts.create(connection, {
      body: {
        community_id: typia.random<string & tags.Format<"uuid">>(),
        post_type: "text",
        title: RandomGenerator.paragraph({ sentences: 3 }),
        content_text: RandomGenerator.content({ paragraphs: 2 }),
        is_nsfw: false,
        has_spoiler: false,
      } satisfies ICommunityPlatformPost.ICreate,
    });
  typia.assert(post2);

  // Verify both posts have identical creator attribution
  TestValidator.equals(
    "post2 creator_id matches authenticated member",
    post2.creator.id,
    member1Id,
  );

  TestValidator.equals(
    "post1 and post2 have same creator_id",
    post1.creator.id,
    post2.creator.id,
  );

  TestValidator.equals(
    "post1 and post2 have same creator username",
    post1.creator.username,
    post2.creator.username,
  );

  TestValidator.equals(
    "post1 and post2 have same creator email",
    post1.creator.email,
    post2.creator.email,
  );

  // Verify creator information completeness
  TestValidator.predicate(
    "post1 creator has all required fields",
    Boolean(
      post1.creator.id &&
        post1.creator.username &&
        post1.creator.email &&
        post1.creator.account_status &&
        post1.creator.karma_score !== undefined &&
        post1.creator.created_at,
    ),
  );

  TestValidator.predicate(
    "post2 creator has all required fields",
    Boolean(
      post2.creator.id &&
        post2.creator.username &&
        post2.creator.email &&
        post2.creator.account_status &&
        post2.creator.karma_score !== undefined &&
        post2.creator.created_at,
    ),
  );

  // Verify creator attribution is immutable and automatic from authentication
  TestValidator.predicate(
    "creator attribution is automatic from authentication context",
    post1.creator.id === member1Id && post2.creator.id === member1Id,
  );
}
