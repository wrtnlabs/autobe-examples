import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityCommunityCategories } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityCategories";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";

/**
 * Test community creation with posting requirements including minimum account
 * age and karma thresholds. Validates that communities can establish quality
 * control measures for content contribution eligibility.
 *
 * This test creates a member account and then establishes a new community with
 * specific posting requirements including minimum account age and karma
 * thresholds. These quality control measures help ensure that only established
 * members with sufficient platform engagement can contribute content to the
 * community.
 *
 * The test validates:
 *
 * 1. Member registration with proper authentication
 * 2. Community creation with posting requirement configuration
 * 3. Verification that posting requirements are properly stored and returned
 * 4. Validation of quality control measure implementation
 */
export async function test_api_community_creation_with_posting_requirements(
  connection: api.IConnection,
) {
  // Step 1: Create a member account for community creation
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member: IRedditCommunityMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        nickname: RandomGenerator.name(),
        email: memberEmail,
        password: "SecurePassword123!",
      } satisfies IRedditCommunityMember.ICreate,
    });
  typia.assert(member);

  // Step 2: Create a community with posting requirements
  const communityName = RandomGenerator.alphaNumeric(10);
  const communityTitle = RandomGenerator.paragraph({ sentences: 3 });
  const communityDescription = RandomGenerator.content({ paragraphs: 2 });

  const community: IRedditCommunityCommunity =
    await api.functional.redditCommunity.member.communities.create(connection, {
      body: {
        name: communityName,
        title: communityTitle,
        description: communityDescription,
        category_name: "Technology",
        type: "public",
        post_requirement_min_age: 30, // Minimum 30 days account age
        post_requirement_min_karma: 100, // Minimum 100 karma points
        allow_crosspost: true,
      } satisfies IRedditCommunityCommunity.ICreate,
    });
  typia.assert(community);

  // Step 3: Validate community creation and posting requirements
  TestValidator.equals("community name matches", community.name, communityName);
  TestValidator.equals(
    "community title matches",
    community.title,
    communityTitle,
  );
  TestValidator.equals(
    "community description matches",
    community.description,
    communityDescription,
  );
  TestValidator.equals("community type matches", community.type, "public");
  TestValidator.equals("crossposting allowed", community.allow_crosspost, true);

  // Validate posting requirements are properly configured
  TestValidator.equals(
    "minimum account age requirement",
    community.post_requirement_min_age,
    30,
  );
  TestValidator.equals(
    "minimum karma requirement",
    community.post_requirement_min_karma,
    100,
  );

  // Validate community has proper category assignment
  TestValidator.predicate(
    "category is assigned",
    community.category !== null && community.category !== undefined,
  );
  TestValidator.equals(
    "category name matches",
    community.category.name,
    "Technology",
  );

  // Validate timestamps are properly set
  TestValidator.predicate(
    "created_at is valid date",
    community.created_at !== null && community.created_at !== undefined,
  );
  TestValidator.predicate(
    "updated_at is valid date",
    community.updated_at !== null && community.updated_at !== undefined,
  );
  TestValidator.equals("community is not deleted", community.deleted_at, null);

  // Validate subscriber count starts at 0
  TestValidator.equals(
    "initial subscriber count",
    community.subscriber_count,
    0,
  );
}
