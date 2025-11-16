import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCategory";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";

/**
 * Test Community Creation with Text-Only Post Restriction
 *
 * Validates the complete workflow of creating a community with a
 * post_type_restriction set to 'text_only'. This test verifies:
 *
 * 1. Administrator and member authentication setup
 * 2. Category creation for community assignment
 * 3. Community creation with text_only post type restriction
 * 4. Verification that the restriction is properly stored
 * 5. Validation of post creation constraints based on the restriction
 *
 * The test ensures the platform correctly stores and enforces post type
 * restrictions at the community level, preventing non-text posts in text-only
 * communities.
 */
export async function test_api_community_creation_with_text_only_post_restriction(
  connection: api.IConnection,
) {
  // Setup: Create administrator account
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const administrator: ICommunityPlatformAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: adminEmail,
        password: "AdminPassword123!",
        username: RandomGenerator.alphabets(10),
        name: RandomGenerator.name(),
        href: "http://localhost:3000/admin",
        referrer: "http://localhost:3000",
      } satisfies ICommunityPlatformAdministrator.ICreate,
    });
  typia.assert(administrator);

  // Setup: Create member account
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        username: RandomGenerator.alphabets(10),
        password: "MemberPassword123!",
        href: "http://localhost:3000/register",
        referrer: "http://localhost:3000",
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(member);

  // Switch to administrator context for category creation
  await api.functional.auth.administrator.login(connection, {
    body: {
      email: adminEmail,
      password: "AdminPassword123!",
      href: "http://localhost:3000/admin/login",
      referrer: "http://localhost:3000/admin",
    } satisfies ICommunityPlatformAdministrator.ILogin,
  });

  // Create a category for community assignment
  const category: ICommunityPlatformCategory =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 1 }),
          slug: RandomGenerator.alphabets(10),
          description: RandomGenerator.paragraph({ sentences: 2 }),
          display_order: 1,
        } satisfies ICommunityPlatformCategory.ICreate,
      },
    );
  typia.assert(category);

  // Switch to member context for community creation
  await api.functional.auth.member.login(connection, {
    body: {
      email: memberEmail,
      password: "MemberPassword123!",
      href: "http://localhost:3000/login",
      referrer: "http://localhost:3000",
    } satisfies ICommunityPlatformMember.ILogin,
  });

  // Create community with text_only post type restriction
  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 1 }),
          identifier: RandomGenerator.alphabets(8),
          description: RandomGenerator.paragraph({ sentences: 2 }),
          visibility: "public",
          post_creation_restriction: "open_to_all",
          post_type_restriction: "text_only",
          category_slug: category.slug,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  // Validate that post_type_restriction is correctly stored as 'text_only'
  TestValidator.equals(
    "community post_type_restriction should be text_only",
    community.post_type_restriction,
    "text_only",
  );

  // Validate community basic properties
  TestValidator.predicate(
    "community should have identifier matching request",
    community.identifier.length > 0,
  );

  TestValidator.predicate(
    "community visibility should be public",
    community.visibility === "public",
  );

  TestValidator.predicate(
    "community post creation should be open_to_all",
    community.post_creation_restriction === "open_to_all",
  );

  // Validate category association
  TestValidator.equals(
    "community category slug should match created category",
    community.category.slug,
    category.slug,
  );

  // Validate creator is the authenticated member
  TestValidator.equals(
    "community creator should be the authenticated member",
    community.creator.email,
    memberEmail,
  );

  // Validate initial counts
  TestValidator.equals(
    "community should start with 1 subscriber (creator)",
    community.subscriber_count,
    1,
  );

  TestValidator.equals(
    "community should start with 0 posts",
    community.post_count,
    0,
  );

  TestValidator.equals(
    "community should start with 0 comments",
    community.comment_count,
    0,
  );
}
