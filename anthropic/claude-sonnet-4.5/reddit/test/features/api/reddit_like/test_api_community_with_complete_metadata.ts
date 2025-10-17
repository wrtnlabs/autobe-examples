import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";

/**
 * Test retrieving a community with comprehensive metadata including visual
 * branding, categorization, and engagement statistics.
 *
 * This test validates the complete metadata workflow for Reddit-like
 * communities. It creates a community with all optional fields populated (icon
 * URL, banner URL, primary category, secondary tags, custom privacy/posting
 * settings) and retrieves it to verify all metadata is properly stored and
 * returned.
 *
 * The test ensures that:
 *
 * 1. Member can authenticate and create a fully configured community
 * 2. Community with complete metadata is successfully created
 * 3. All metadata fields are correctly retrieved from the API
 * 4. Categorization fields power community discovery features
 * 5. Branding elements (icon, banner) enable community identity recognition
 * 6. Engagement statistics (subscriber_count) are accurately calculated and
 *    denormalized
 * 7. Initial state values are correct (subscriber_count = 0, is_archived = false)
 */
export async function test_api_community_with_complete_metadata(
  connection: api.IConnection,
) {
  // Step 1: Register and authenticate a new member to create the community
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = typia.random<string & tags.MinLength<8>>();

  const member: IRedditLikeMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        username: RandomGenerator.alphaNumeric(12),
        email: memberEmail,
        password: memberPassword,
      } satisfies IRedditLikeMember.ICreate,
    });
  typia.assert(member);

  // Step 2: Create a community with ALL optional metadata fields populated
  const categories = [
    "Technology",
    "Gaming",
    "Sports",
    "Entertainment",
    "Education",
    "Science",
    "Arts",
    "News",
    "Lifestyle",
    "Business",
    "Other",
  ] as const;
  const primaryCategory = RandomGenerator.pick(categories);

  const secondaryTagOptions = [
    "discussion",
    "questions",
    "showcase",
    "news",
    "tutorial",
    "review",
    "announcement",
    "community",
  ];
  const secondaryTags = RandomGenerator.sample(secondaryTagOptions, 3).join(
    ",",
  );

  const communityCode = RandomGenerator.alphaNumeric(8);
  const communityName = RandomGenerator.paragraph({
    sentences: 2,
    wordMin: 3,
    wordMax: 6,
  });
  const communityDescription = RandomGenerator.paragraph({
    sentences: 5,
    wordMin: 4,
    wordMax: 8,
  });

  const createdCommunity: IRedditLikeCommunity =
    await api.functional.redditLike.member.communities.create(connection, {
      body: {
        code: communityCode,
        name: communityName,
        description: communityDescription,
        icon_url: `https://example.com/icons/${communityCode}.png`,
        banner_url: `https://example.com/banners/${communityCode}_banner.jpg`,
        privacy_type: "public",
        posting_permission: "anyone_subscribed",
        allow_text_posts: true,
        allow_link_posts: true,
        allow_image_posts: true,
        primary_category: primaryCategory,
        secondary_tags: secondaryTags,
      } satisfies IRedditLikeCommunity.ICreate,
    });
  typia.assert(createdCommunity);

  // Step 3: Retrieve the community by ID to validate all metadata is returned
  const retrievedCommunity: IRedditLikeCommunity =
    await api.functional.redditLike.communities.at(connection, {
      communityId: createdCommunity.id,
    });
  typia.assert(retrievedCommunity);

  // Step 4: Validate core identification fields match
  TestValidator.equals(
    "community ID matches",
    retrievedCommunity.id,
    createdCommunity.id,
  );
  TestValidator.equals(
    "community code matches",
    retrievedCommunity.code,
    communityCode,
  );
  TestValidator.equals(
    "community name matches",
    retrievedCommunity.name,
    communityName,
  );
  TestValidator.equals(
    "community description matches",
    retrievedCommunity.description,
    communityDescription,
  );

  // Step 5: Validate visual branding metadata is present and correct
  TestValidator.equals(
    "icon URL is returned",
    retrievedCommunity.icon_url,
    `https://example.com/icons/${communityCode}.png`,
  );
  TestValidator.equals(
    "banner URL is returned",
    retrievedCommunity.banner_url,
    `https://example.com/banners/${communityCode}_banner.jpg`,
  );

  // Step 6: Validate categorization metadata for discovery
  TestValidator.equals(
    "primary category for discovery",
    retrievedCommunity.primary_category,
    primaryCategory,
  );
  TestValidator.equals(
    "secondary tags for discoverability",
    retrievedCommunity.secondary_tags,
    secondaryTags,
  );

  // Step 7: Validate privacy and posting permission settings
  TestValidator.equals(
    "privacy type configuration",
    retrievedCommunity.privacy_type,
    "public",
  );
  TestValidator.equals(
    "posting permission configuration",
    retrievedCommunity.posting_permission,
    "anyone_subscribed",
  );

  // Step 8: Validate content type allowances
  TestValidator.equals(
    "text posts allowed",
    retrievedCommunity.allow_text_posts,
    true,
  );
  TestValidator.equals(
    "link posts allowed",
    retrievedCommunity.allow_link_posts,
    true,
  );
  TestValidator.equals(
    "image posts allowed",
    retrievedCommunity.allow_image_posts,
    true,
  );

  // Step 9: Validate engagement statistics are correctly denormalized
  TestValidator.equals(
    "subscriber count initialized to 0",
    retrievedCommunity.subscriber_count,
    0,
  );

  // Step 10: Validate initial state flags
  TestValidator.equals(
    "community not archived initially",
    retrievedCommunity.is_archived,
    false,
  );

  // Step 11: Validate temporal metadata
  TestValidator.predicate(
    "created_at timestamp is valid",
    retrievedCommunity.created_at !== null &&
      retrievedCommunity.created_at !== undefined,
  );
  TestValidator.predicate(
    "updated_at timestamp is valid",
    retrievedCommunity.updated_at !== null &&
      retrievedCommunity.updated_at !== undefined,
  );
}
