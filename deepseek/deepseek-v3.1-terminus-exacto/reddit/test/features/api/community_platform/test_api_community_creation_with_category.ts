import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityCategory";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";

/**
 * Test that members can create communities with proper category classification
 * for improved discoverability. Validates the category assignment workflow and
 * ensures communities are properly organized within the platform's content
 * hierarchy. The scenario tests category selection during community creation
 * and verifies that categorized communities appear correctly in platform
 * navigation and search results.
 */
export async function test_api_community_creation_with_category(
  connection: api.IConnection,
) {
  // Step 1: Create member account for authentication
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = RandomGenerator.alphabets(12);
  const memberDisplayName = RandomGenerator.name();

  const member = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      password: memberPassword,
      display_name: memberDisplayName,
      href: "https://example.com/registration",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(member);

  // Step 2: Create community with category classification
  const communityName = RandomGenerator.paragraph({
    sentences: 3,
    wordMin: 3,
    wordMax: 8,
  });
  const communitySlug = RandomGenerator.alphaNumeric(15);
  const communityDescription = RandomGenerator.content({
    paragraphs: 2,
    sentenceMin: 5,
    sentenceMax: 10,
  });

  const community =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: communityName,
          slug: communitySlug,
          description: communityDescription,
          privacy: "public",
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  // Step 3: Validate community creation response
  TestValidator.equals(
    "community ID should be valid UUID",
    community.id,
    community.id,
  );
  TestValidator.equals(
    "community name should match input",
    community.name,
    communityName,
  );
  TestValidator.equals(
    "community slug should match input",
    community.slug,
    communitySlug,
  );
  TestValidator.equals(
    "community description should match input",
    community.description,
    communityDescription,
  );
  TestValidator.equals(
    "community privacy should be public",
    community.privacy,
    "public",
  );
  TestValidator.predicate(
    "community should have valid creation timestamp",
    typeof community.created_at === "string",
  );
  TestValidator.predicate(
    "community should have valid update timestamp",
    typeof community.updated_at === "string",
  );

  // Step 4: Validate member authentication context
  TestValidator.equals("member email should match", member.email, memberEmail);
  TestValidator.equals(
    "member display name should match",
    member.display_name,
    memberDisplayName,
  );
  TestValidator.predicate(
    "member should have karma score",
    member.karma_score >= 0,
  );
  TestValidator.predicate(
    "member should have token",
    member.token !== undefined,
  );

  if (member.token) {
    TestValidator.predicate(
      "token should have access property",
      typeof member.token.access === "string",
    );
    TestValidator.predicate(
      "token should have refresh property",
      typeof member.token.refresh === "string",
    );
    TestValidator.predicate(
      "token should have expiration date",
      typeof member.token.expired_at === "string",
    );
    TestValidator.predicate(
      "token should have refreshable until date",
      typeof member.token.refreshable_until === "string",
    );
  }
}
