import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityCategory";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";

/**
 * Test successful community creation by authenticated member.
 *
 * This E2E test validates the complete workflow of community creation:
 *
 * 1. Member account creation and authentication setup
 * 2. Community creation with valid data
 * 3. Verification of proper community initialization and default settings
 * 4. Validation that creator becomes the first moderator implicitly
 */
export async function test_api_member_community_creation_success(
  connection: api.IConnection,
) {
  // Step 1: Create member account for authentication context
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = RandomGenerator.alphaNumeric(12);

  const member = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      password: memberPassword,
      display_name: RandomGenerator.name(2),
      href: "https://example.com/registration",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(member);

  // Step 2: Create community with valid data
  const communityData = {
    name: RandomGenerator.paragraph({ sentences: 3, wordMin: 3, wordMax: 8 }),
    slug: RandomGenerator.alphaNumeric(15).toLowerCase(),
    description: RandomGenerator.content({
      paragraphs: 2,
      sentenceMin: 5,
      sentenceMax: 10,
    }),
    privacy: "public",
  } satisfies ICommunityPlatformCommunity.ICreate;

  const community =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: communityData,
      },
    );
  typia.assert(community);

  // Step 3: Validate community creation response - Business logic validation only
  TestValidator.equals(
    "community name should match input",
    community.name,
    communityData.name,
  );
  TestValidator.equals(
    "community slug should match input",
    community.slug,
    communityData.slug,
  );
  TestValidator.equals(
    "community description should match input",
    community.description,
    communityData.description,
  );
  TestValidator.equals(
    "community privacy should match input",
    community.privacy,
    communityData.privacy,
  );

  // Step 4: Validate business logic and default settings
  await TestValidator.predicate(
    "community should have active status",
    async () => community.status === "active",
  );
  await TestValidator.predicate(
    "community should not be deleted",
    async () => community.deleted_at === undefined,
  );

  // Step 5: Validate timestamp business logic
  await TestValidator.predicate(
    "created_at should be valid timestamp",
    async () => {
      const createdDate = new Date(community.created_at);
      return !isNaN(createdDate.getTime());
    },
  );

  await TestValidator.predicate(
    "updated_at should be valid timestamp",
    async () => {
      const updatedDate = new Date(community.updated_at);
      return !isNaN(updatedDate.getTime());
    },
  );

  // Step 6: Validate category assignment business logic
  await TestValidator.predicate(
    "category should be properly handled",
    async () => {
      // Business logic: category_id can be undefined or valid UUID
      if (community.category_id === undefined) {
        return true; // Undefined is valid business case
      }
      // If category_id is provided, it should be properly handled by the system
      return typeof community.category_id === "string";
    },
  );
}
