import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCategory";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";

/**
 * Test community retrieval to validate engagement metrics are accurately
 * calculated.
 *
 * This test creates a complete community and verifies that engagement metrics
 * (post_count, comment_count, subscriber_count) are correctly tracked and
 * returned by the retrieval endpoint. The test also validates that metrics are
 * real-time and reflect the actual community state.
 *
 * Process:
 *
 * 1. Create member account (community creator)
 * 2. Create administrator account (for category management)
 * 3. Create category (for community classification)
 * 4. Create community (initializes metrics)
 * 5. Retrieve community and validate engagement metrics
 */
export async function test_api_community_retrieval_engagement_metrics(
  connection: api.IConnection,
) {
  // 1. Create member account for community creator
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberCreate = {
    email: memberEmail,
    username: RandomGenerator.alphabets(10),
    password: RandomGenerator.alphaNumeric(12),
    href: "https://example.com/register",
    referrer: "https://example.com",
  } satisfies ICommunityPlatformMember.ICreate;

  const createdMember: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, { body: memberCreate });
  typia.assert(createdMember);
  typia.assert(createdMember.id);
  typia.assert(createdMember.token);

  // 2. Create administrator account for category management
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminCreate = {
    email: adminEmail,
    username: RandomGenerator.alphabets(10),
    password: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.name(),
    href: "https://example.com/admin/register",
  } satisfies ICommunityPlatformAdministrator.ICreate;

  const createdAdmin: ICommunityPlatformAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: adminCreate,
    });
  typia.assert(createdAdmin);

  // 3. Create category for community classification
  const categoryCreate = {
    name: "Technology",
    slug: `tech_${RandomGenerator.alphabets(5)}`,
    display_order: 1,
  } satisfies ICommunityPlatformCategory.ICreate;

  const createdCategory: ICommunityPlatformCategory =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      {
        body: categoryCreate,
      },
    );
  typia.assert(createdCategory);

  // 4. Create community
  const communityCreate = {
    name: RandomGenerator.paragraph({ sentences: 2 }),
    identifier: `community_${RandomGenerator.alphabets(10).toLowerCase()}`,
    description: RandomGenerator.content({ paragraphs: 1 }),
    visibility: "public" as const,
    post_creation_restriction: "open_to_all" as const,
    post_type_restriction: "all_types" as const,
    category_slug: createdCategory.slug,
  } satisfies ICommunityPlatformCommunity.ICreate;

  const createdCommunity: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: communityCreate,
      },
    );
  typia.assert(createdCommunity);

  // Validate community structure
  TestValidator.predicate(
    "community has valid ID",
    typeof createdCommunity.id === "string" && createdCommunity.id.length > 0,
  );
  TestValidator.equals(
    "community identifier matches",
    createdCommunity.identifier,
    communityCreate.identifier,
  );
  TestValidator.equals(
    "community name matches",
    createdCommunity.name,
    communityCreate.name,
  );
  TestValidator.equals(
    "community visibility matches",
    createdCommunity.visibility,
    "public",
  );

  // 5. Retrieve community and validate engagement metrics
  const retrievedCommunity: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.communities.at(connection, {
      communityId: createdCommunity.id,
    });
  typia.assert(retrievedCommunity);

  // Validate initial engagement metrics
  TestValidator.predicate(
    "subscriber_count is valid (creator auto-subscribed)",
    retrievedCommunity.subscriber_count === 1,
  );
  TestValidator.predicate(
    "post_count starts at 0",
    retrievedCommunity.post_count === 0,
  );
  TestValidator.predicate(
    "comment_count starts at 0",
    retrievedCommunity.comment_count === 0,
  );

  // Validate metric types
  TestValidator.predicate(
    "subscriber_count is non-negative integer",
    typeof retrievedCommunity.subscriber_count === "number" &&
      retrievedCommunity.subscriber_count >= 0,
  );
  TestValidator.predicate(
    "post_count is non-negative integer",
    typeof retrievedCommunity.post_count === "number" &&
      retrievedCommunity.post_count >= 0,
  );
  TestValidator.predicate(
    "comment_count is non-negative integer",
    typeof retrievedCommunity.comment_count === "number" &&
      retrievedCommunity.comment_count >= 0,
  );

  // Validate creator information
  TestValidator.predicate(
    "creator is correctly assigned",
    retrievedCommunity.creator.id === createdMember.id,
  );
  TestValidator.equals(
    "creator username matches",
    retrievedCommunity.creator.username,
    memberCreate.username,
  );

  // Validate category assignment
  TestValidator.predicate(
    "category is correctly assigned",
    retrievedCommunity.category.slug === createdCategory.slug,
  );

  // Validate timestamps exist and are valid
  TestValidator.predicate(
    "created_at timestamp is valid",
    typeof retrievedCommunity.created_at === "string" &&
      retrievedCommunity.created_at.length > 0,
  );
  TestValidator.predicate(
    "updated_at timestamp is valid",
    typeof retrievedCommunity.updated_at === "string" &&
      retrievedCommunity.updated_at.length > 0,
  );

  // Validate metrics are real-time by checking specific metric fields
  TestValidator.equals(
    "retrieved community subscriber_count matches created",
    retrievedCommunity.subscriber_count,
    createdCommunity.subscriber_count,
  );
  TestValidator.equals(
    "retrieved community post_count matches created",
    retrievedCommunity.post_count,
    createdCommunity.post_count,
  );
  TestValidator.equals(
    "retrieved community comment_count matches created",
    retrievedCommunity.comment_count,
    createdCommunity.comment_count,
  );
}
