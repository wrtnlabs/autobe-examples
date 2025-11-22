import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformRegisteredUser";

export async function test_api_community_retrieval_restricted_community(
  connection: api.IConnection,
) {
  // Step 1: Create a test user who will create the restricted community
  const creatorEmail = typia.random<string & tags.Format<"email">>();
  const creatorUser = await api.functional.auth.registeredUser.join(
    connection,
    {
      body: {
        username: `creator_${RandomGenerator.alphaNumeric(8)}`,
        email: creatorEmail,
        password: "TestPassword123!",
        display_name: "Community Creator",
        bio: "Test user creating restricted community",
        location: "Test City",
        website_url: typia.random<string & tags.Format<"uri">>(),
        avatar_url: typia.random<string & tags.Format<"uri">>(),
        href: "https://test.example.com/register",
        referrer: "https://test.example.com",
      } satisfies IRedditPlatformRegisteredUser.ICreate,
    },
  );
  typia.assert(creatorUser);

  // Step 2: Create a restricted community
  const communityName = `restricted_${RandomGenerator.alphaNumeric(8)}`;
  const restrictedCommunity =
    await api.functional.redditPlatform.registeredUser.communities.create(
      connection,
      {
        body: {
          name: communityName,
          title: "Restricted Test Community",
          description:
            "A private testing community with restricted access for E2E testing purposes",
          type: "restricted",
          allow_text_posts: true,
          allow_link_posts: true,
          allow_image_posts: true,
          require_post_approval: false,
          require_comment_approval: false,
          nsfw_content_allowed: false,
        } satisfies IRedditPlatformCommunity.ICreate,
      },
    );
  typia.assert(restrictedCommunity);

  // Step 3: Create an unauthenticated connection for testing non-member access
  const unauthConnection: api.IConnection = { ...connection, headers: {} };

  // Step 4: Test retrieving the restricted community without authentication
  const retrievedCommunity = await api.functional.redditPlatform.communities.at(
    unauthConnection,
    {
      communityName: communityName,
    },
  );
  typia.assert(retrievedCommunity);

  // Step 5: Validate access control - restricted community should be viewable to non-members
  TestValidator.equals(
    "community name is accessible",
    retrievedCommunity.name,
    communityName,
  );
  TestValidator.equals(
    "community title is accessible",
    retrievedCommunity.title,
    "Restricted Test Community",
  );
  TestValidator.equals(
    "community type is restricted",
    retrievedCommunity.type,
    "restricted",
  );
  TestValidator.equals(
    "community status is active",
    retrievedCommunity.status,
    "active",
  );
  TestValidator.equals(
    "community allows text posts",
    retrievedCommunity.allow_text_posts,
    true,
  );
  TestValidator.equals(
    "community allows link posts",
    retrievedCommunity.allow_link_posts,
    true,
  );
  TestValidator.equals(
    "community allows image posts",
    retrievedCommunity.allow_image_posts,
    true,
  );
  TestValidator.equals(
    "community requires post approval",
    retrievedCommunity.require_post_approval,
    false,
  );
  TestValidator.equals(
    "community requires comment approval",
    retrievedCommunity.require_comment_approval,
    false,
  );
  TestValidator.equals(
    "community allows NSFW content",
    retrievedCommunity.nsfw_content_allowed,
    false,
  );

  // Step 6: Validate that creator information is accessible (basic user info)
  TestValidator.equals(
    "creator ID is present",
    retrievedCommunity.creator.id,
    creatorUser.id,
  );
  TestValidator.equals(
    "creator username is accessible",
    retrievedCommunity.creator.username,
    creatorUser.username,
  );
  TestValidator.equals(
    "creator display name is accessible",
    retrievedCommunity.creator.display_name,
    "Community Creator",
  );

  // Step 7: Validate community statistics are present
  TestValidator.predicate(
    "member count is non-negative",
    retrievedCommunity.member_count >= 0,
  );
  TestValidator.predicate(
    "subscriber count is non-negative",
    retrievedCommunity.subscriber_count >= 0,
  );
  TestValidator.predicate(
    "post count is non-negative",
    retrievedCommunity.post_count >= 0,
  );

  // Step 8: Validate timestamps are present and valid
  TestValidator.predicate(
    "created timestamp is valid ISO format",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(
      retrievedCommunity.created_at,
    ),
  );
  TestValidator.predicate(
    "updated timestamp is valid ISO format",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(
      retrievedCommunity.updated_at,
    ),
  );

  // Step 9: Ensure no sensitive information is leaked in the response
  TestValidator.equals(
    "deleted_at should be undefined for active community",
    retrievedCommunity.deleted_at,
    undefined,
  );

  // Step 10: Test accessing a non-existent community to verify error handling
  await TestValidator.error(
    "non-existent community should return error",
    async () => {
      await api.functional.redditPlatform.communities.at(unauthConnection, {
        communityName: `nonexistent_${RandomGenerator.alphaNumeric(8)}`,
      });
    },
  );
}
