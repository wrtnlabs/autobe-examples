import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityCommunityCategories } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityCategories";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";

/**
 * Test the basic community creation workflow including authentication and
 * community properties.
 *
 * This test validates that a member can successfully create a community with
 * proper configuration, including name, title, description, category
 * assignment, and access type settings. It covers the complete flow from member
 * registration to community creation and verification.
 *
 * @param connection - API connection for making authenticated requests
 */
export async function test_api_community_creation_basic_flow(
  connection: api.IConnection,
) {
  // Step 1: Register a new member account
  // This creates the authentication context required for community creation
  const email = typia.random<string & tags.Format<"email">>();
  const nickname = typia.random<
    string & tags.MinLength<1> & tags.MaxLength<21>
  >();

  const member = await api.functional.auth.member.join(connection, {
    body: {
      nickname: nickname,
      email: email,
      password: "securePassword123",
    } satisfies IRedditCommunityMember.ICreate,
  });

  typia.assert(member);

  // Step 2: Create a new community
  // Generate required properties with appropriate constraints
  const communityName = RandomGenerator.alphaNumeric(8).toLowerCase();
  const communityTitle = RandomGenerator.name(3);
  const communityDescription = RandomGenerator.content({
    paragraphs: 2,
    sentenceMin: 8,
    sentenceMax: 15,
  });

  // Use a predefined category that should exist
  const categoryName = "Technology";

  const community =
    await api.functional.redditCommunity.member.communities.create(connection, {
      body: {
        name: communityName,
        title: communityTitle,
        description: communityDescription,
        category_name: categoryName,
        type: "public",
        post_requirement_min_age: 7,
        post_requirement_min_karma: 10,
        allow_crosspost: true,
      } satisfies IRedditCommunityCommunity.ICreate,
    });

  typia.assert(community);

  // Step 3: Verify community properties
  // Validate mandatory properties have expected values
  TestValidator.equals(
    "community name matches input",
    community.name,
    communityName,
  );
  TestValidator.equals(
    "community title matches input",
    community.title,
    communityTitle,
  );
  TestValidator.equals(
    "community description matches input",
    community.description,
    communityDescription,
  );
  TestValidator.equals("community type is public", community.type, "public");
  TestValidator.equals(
    "subscriber count starts at zero",
    community.subscriber_count,
    0,
  );
  TestValidator.equals(
    "crosspost allowed matches input",
    community.allow_crosspost,
    true,
  );
  TestValidator.predicate(
    "created timestamp is valid",
    new Date(community.created_at).getTime() > 0,
  );
  TestValidator.equals("deleted timestamp is null", community.deleted_at, null);
}
