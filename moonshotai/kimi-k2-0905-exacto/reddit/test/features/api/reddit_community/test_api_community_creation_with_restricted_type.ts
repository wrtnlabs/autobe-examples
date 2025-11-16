import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityCommunityCategories } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityCategories";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";

/**
 * Test creating a 'restricted' type community to validate access control and
 * member permissions are properly configured for approval-based communities.
 *
 * This test validates the community creation functionality with restricted
 * access type, ensuring proper configuration of:
 *
 * 1. Member authentication
 * 2. Restricted community type selection
 * 3. Posting requirements configuration (minimum account age and karma)
 * 4. Crossposting permissions
 * 5. Community metadata validation
 *
 * The restricted community type enables approval-based participation where
 * members can view content but require moderator approval for posting,
 * providing controlled community management capabilities.
 */
export async function test_api_community_creation_with_restricted_type(
  connection: api.IConnection,
): Promise<void> {
  // 1. First, authenticate as a member to establish required permissions
  const member: IRedditCommunityMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        nickname: RandomGenerator.name(),
        email: typia.random<string & tags.Format<"email">>(),
        password: "ValidPassword123!",
      } satisfies IRedditCommunityMember.ICreate,
    });
  typia.assert(member);

  // 2. Create a restricted community with specific configuration
  const communityName = RandomGenerator.alphabets(10);
  const communityTitle = RandomGenerator.name(3);
  const communityDescription = RandomGenerator.content({
    paragraphs: 2,
    sentenceMin: 3,
    sentenceMax: 5,
  });

  const restrictedCommunity: IRedditCommunityCommunity =
    await api.functional.redditCommunity.member.communities.create(connection, {
      body: {
        name: communityName,
        title: communityTitle,
        description: communityDescription,
        category_name: "Technology", // Using valid category name
        type: "restricted",
        post_requirement_min_age: 30,
        post_requirement_min_karma: 50,
        allow_crosspost: true,
      } satisfies IRedditCommunityCommunity.ICreate,
    });
  typia.assert(restrictedCommunity);

  // 3. Validate the community was created with correct restricted type
  TestValidator.equals(
    "community type should be restricted",
    restrictedCommunity.type,
    "restricted",
  );

  // 4. Verify community name and title match input
  TestValidator.equals(
    "community name matches",
    restrictedCommunity.name,
    communityName,
  );
  TestValidator.equals(
    "community title matches",
    restrictedCommunity.title,
    communityTitle,
  );
  TestValidator.equals(
    "community description matches",
    restrictedCommunity.description,
    communityDescription,
  );

  // 5. Validate posting requirements are properly configured
  TestValidator.equals(
    "minimum account age requirement",
    restrictedCommunity.post_requirement_min_age,
    30,
  );
  TestValidator.equals(
    "minimum karma requirement",
    restrictedCommunity.post_requirement_min_karma,
    50,
  );
  TestValidator.equals(
    "crossposting enabled",
    restrictedCommunity.allow_crosspost,
    true,
  );

  // 6. Verify community metrics and metadata
  TestValidator.predicate(
    "subscriber count starts at 0",
    restrictedCommunity.subscriber_count === 0,
  );
  TestValidator.predicate(
    "created_at is populated",
    restrictedCommunity.created_at !== null &&
      restrictedCommunity.created_at !== undefined,
  );
  TestValidator.equals(
    "deleted_at should be null",
    restrictedCommunity.deleted_at,
    null,
  );

  // 7. Validate category association is properly set
  TestValidator.predicate(
    "category is not null",
    restrictedCommunity.category !== null &&
      restrictedCommunity.category !== undefined,
  );
  TestValidator.predicate(
    "category has valid ID format",
    /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      restrictedCommunity.category.id,
    ),
  );
}
