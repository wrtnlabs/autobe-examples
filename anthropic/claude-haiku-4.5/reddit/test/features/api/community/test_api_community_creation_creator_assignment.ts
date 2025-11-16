import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCategory";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";

/**
 * Test that the authenticated member automatically becomes the community
 * creator.
 *
 * This test validates the core business logic of community creation:
 *
 * - Authenticated member initiates community creation
 * - System automatically assigns authenticated member as creator
 * - Creator ID is determined from authentication context (not request parameter)
 * - Response includes complete creator information with member ID
 * - Creator is the only user set as creator regardless of submitted data
 *
 * Process:
 *
 * 1. Create and authenticate an administrator account
 * 2. Create a category for community classification
 * 3. Create and authenticate a member account
 * 4. Create a community with the authenticated member
 * 5. Verify creator is the authenticated member
 * 6. Verify creator information is included in response
 */
export async function test_api_community_creation_creator_assignment(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate administrator
  const adminEmail = `admin-${RandomGenerator.alphaNumeric(8)}@example.com`;
  const adminCreate = {
    email: adminEmail,
    password: "SecurePass123!",
    username: `admin_${RandomGenerator.alphaNumeric(8)}`,
    name: RandomGenerator.name(),
    href: "https://example.com/admin",
    referrer: "",
  };

  const admin: ICommunityPlatformAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: adminCreate satisfies ICommunityPlatformAdministrator.ICreate,
    });
  typia.assert(admin);

  // Step 2: Create a category
  const categoryData = {
    name: "Technology",
    slug: `tech-${RandomGenerator.alphaNumeric(6)}`,
    description: "Technology and programming discussions",
    display_order: 1,
  };

  const category: ICommunityPlatformCategory =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      {
        body: categoryData satisfies ICommunityPlatformCategory.ICreate,
      },
    );
  typia.assert(category);

  // Step 3: Create and authenticate member
  const memberEmail = `member-${RandomGenerator.alphaNumeric(8)}@example.com`;
  const memberUsername = `member_${RandomGenerator.alphaNumeric(8)}`;
  const memberPassword = "SecurePass123!";
  const memberCreate = {
    email: memberEmail,
    password: memberPassword,
    username: memberUsername,
    href: "https://example.com/register",
    referrer: "https://example.com",
  };

  const memberJoinResponse: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: memberCreate satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(memberJoinResponse);
  const memberId = memberJoinResponse.id;

  // Step 3b: Login as member to establish authentication context
  const memberLoginResponse: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.login(connection, {
      body: {
        email: memberEmail,
        password: memberPassword,
        href: "https://example.com/login",
        referrer: "",
      } satisfies ICommunityPlatformMember.ILogin,
    });
  typia.assert(memberLoginResponse);

  // Step 4: Create community as authenticated member
  const communityData = {
    name: "Tech Discussion Community",
    identifier: `tech_${RandomGenerator.alphaNumeric(10)}`,
    description: "A community for technology enthusiasts",
    visibility: "public" as const,
    post_creation_restriction: "open_to_all" as const,
    post_type_restriction: "all_types" as const,
    category_slug: category.slug,
  };

  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: communityData satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  // Step 5: Verify creator is the authenticated member
  TestValidator.equals(
    "creator ID matches authenticated member ID",
    community.creator.id,
    memberId,
  );

  TestValidator.equals(
    "creator username matches authenticated member username",
    community.creator.username,
    memberUsername,
  );

  // Step 6: Verify creator information is present and complete
  TestValidator.predicate(
    "creator has valid ID",
    () =>
      community.creator.id !== null &&
      community.creator.id !== undefined &&
      community.creator.id.length > 0,
  );

  TestValidator.predicate(
    "creator has username",
    () =>
      community.creator.username !== null &&
      community.creator.username !== undefined &&
      community.creator.username.length > 0,
  );

  TestValidator.predicate(
    "creator has email",
    () =>
      community.creator.email !== null &&
      community.creator.email !== undefined &&
      community.creator.email.length > 0,
  );

  TestValidator.predicate(
    "creator email verified status is set",
    () => typeof community.creator.email_verified === "boolean",
  );

  TestValidator.predicate("creator has valid account status", () =>
    ["active", "suspended", "pending_deletion", "deleted"].includes(
      community.creator.account_status,
    ),
  );

  TestValidator.predicate(
    "creator has non-negative karma score",
    () => community.creator.karma_score >= 0,
  );

  TestValidator.predicate(
    "creator has creation timestamp",
    () =>
      community.creator.created_at !== null &&
      community.creator.created_at !== undefined &&
      community.creator.created_at.length > 0,
  );
}
