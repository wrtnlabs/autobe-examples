import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformRegisteredUser";

/**
 * Test retrieving detailed information for an existing public community without
 * authentication.
 *
 * This test validates that public community details including basic
 * information, operational settings, membership statistics, and metadata are
 * accessible to unauthenticated users with complete community information
 * returned. This is a core functionality for Reddit-like platforms where public
 * communities should be browsable by anyone without requiring user
 * authentication.
 *
 * The test follows this workflow:
 *
 * 1. Create a registered user (required for creating communities)
 * 2. Create a public community with comprehensive settings
 * 3. Switch to unauthenticated connection to simulate anonymous user
 * 4. Retrieve the community details without authentication
 * 5. Validate complete community information is accessible
 * 6. Verify all expected fields and data integrity
 */
export async function test_api_community_retrieval_public_community(
  connection: api.IConnection,
) {
  // Step 1: Create a registered user for community creation
  // This establishes the creator identity needed for community creation
  const userEmail = typia.random<string & tags.Format<"email">>();
  const user: IRedditPlatformRegisteredUser.IAuthorized =
    await api.functional.auth.registeredUser.join(connection, {
      body: {
        username: `testuser_${RandomGenerator.alphaNumeric(8)}`,
        email: userEmail,
        password: "testpassword123",
        display_name: "Test Community Creator",
        bio: "Test user for community retrieval testing",
        location: "Test City, TC",
        website_url: "https://testuser.example.com",
        avatar_url: "https://example.com/avatar.jpg",
        href: "https://test.example.com/register",
        referrer: "https://google.com",
      } satisfies IRedditPlatformRegisteredUser.ICreate,
    });
  typia.assert(user);

  // Step 2: Create a public community with comprehensive settings
  // This tests the full range of community creation capabilities
  const communityName = `testcommunity_${RandomGenerator.alphaNumeric(8)}`;
  const createdCommunity: IRedditPlatformCommunity =
    await api.functional.redditPlatform.registeredUser.communities.create(
      connection,
      {
        body: {
          name: communityName,
          title: "Test Community for Public Retrieval",
          description:
            "A test community designed to validate public accessibility and complete information retrieval for anonymous users. This community includes diverse settings and metadata to ensure comprehensive testing.",
          type: "public",
          allow_text_posts: true,
          allow_link_posts: true,
          allow_image_posts: true,
          require_post_approval: false,
          require_comment_approval: false,
          nsfw_content_allowed: false,
        } satisfies IRedditPlatformCommunity.ICreate,
      },
    );
  typia.assert(createdCommunity);

  // Validate that the community was created with expected properties
  TestValidator.equals(
    "community name matches",
    createdCommunity.name,
    communityName,
  );
  TestValidator.equals(
    "community type is public",
    createdCommunity.type,
    "public",
  );
  TestValidator.equals(
    "community status is active",
    createdCommunity.status,
    "active",
  );
  TestValidator.equals(
    "community creator is set",
    createdCommunity.creator.username,
    user.username,
  );

  // Step 3: Switch to unauthenticated connection to simulate anonymous user
  // This simulates a user who is not logged in trying to browse communities
  const unauthenticatedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  // Step 4: Retrieve the community details without authentication
  // This is the core test - validating public accessibility
  const retrievedCommunity: IRedditPlatformCommunity =
    await api.functional.redditPlatform.communities.at(
      unauthenticatedConnection,
      {
        communityName: communityName,
      },
    );
  typia.assert(retrievedCommunity);

  // Step 5: Validate complete community information is accessible to anonymous users
  // Basic Information Validation
  TestValidator.equals(
    "community ID is accessible",
    retrievedCommunity.id,
    createdCommunity.id,
  );
  TestValidator.equals(
    "community name is accessible",
    retrievedCommunity.name,
    communityName,
  );
  TestValidator.equals(
    "community title is accessible",
    retrievedCommunity.title,
    "Test Community for Public Retrieval",
  );
  TestValidator.equals(
    "community description is accessible",
    retrievedCommunity.description,
    "A test community designed to validate public accessibility and complete information retrieval for anonymous users. This community includes diverse settings and metadata to ensure comprehensive testing.",
  );
  TestValidator.equals(
    "community type is accessible",
    retrievedCommunity.type,
    "public",
  );
  TestValidator.equals(
    "community status is accessible",
    retrievedCommunity.status,
    "active",
  );

  // Creator Information Validation
  TestValidator.equals(
    "creator information is accessible",
    retrievedCommunity.creator.username,
    user.username,
  );
  TestValidator.equals(
    "creator display name is accessible",
    retrievedCommunity.creator.display_name,
    user.displayName,
  );
  TestValidator.equals(
    "creator karma score is accessible",
    retrievedCommunity.creator.karma_score >= 0,
    true,
  );
  TestValidator.equals(
    "creator account status is accessible",
    retrievedCommunity.creator.account_status,
    "active",
  );
  TestValidator.equals(
    "creator email verification is accessible",
    retrievedCommunity.creator.email_verified,
    false,
  ); // New users start unverified

  // Operational Settings Validation
  TestValidator.equals(
    "text posts setting is accessible",
    retrievedCommunity.allow_text_posts,
    true,
  );
  TestValidator.equals(
    "link posts setting is accessible",
    retrievedCommunity.allow_link_posts,
    true,
  );
  TestValidator.equals(
    "image posts setting is accessible",
    retrievedCommunity.allow_image_posts,
    true,
  );
  TestValidator.equals(
    "post approval requirement is accessible",
    retrievedCommunity.require_post_approval,
    false,
  );
  TestValidator.equals(
    "comment approval requirement is accessible",
    retrievedCommunity.require_comment_approval,
    false,
  );
  TestValidator.equals(
    "NSFW content policy is accessible",
    retrievedCommunity.nsfw_content_allowed,
    false,
  );

  // Membership and Activity Statistics Validation
  TestValidator.predicate(
    "member count is non-negative",
    retrievedCommunity.member_count >= 0,
  );
  TestValidator.predicate(
    "post count is non-negative",
    retrievedCommunity.post_count >= 0,
  );
  TestValidator.predicate(
    "subscriber count is non-negative",
    retrievedCommunity.subscriber_count >= 0,
  );

  // Metadata Validation
  TestValidator.predicate(
    "created timestamp is valid",
    typeof retrievedCommunity.created_at === "string",
  );
  TestValidator.predicate(
    "updated timestamp is valid",
    typeof retrievedCommunity.updated_at === "string",
  );
  TestValidator.predicate(
    "deleted timestamp is not set",
    retrievedCommunity.deleted_at === null ||
      retrievedCommunity.deleted_at === undefined,
  );

  // Business Status Validation
  TestValidator.equals(
    "business status is accessible",
    typeof retrievedCommunity.business_status === "string",
    true,
  );

  // Step 6: Verify data integrity and consistency
  // Ensure that the anonymous user receives exactly the same community data
  // that was created, confirming no data filtering for public access
  TestValidator.equals(
    "complete data consistency",
    retrievedCommunity,
    createdCommunity,
  );
}
