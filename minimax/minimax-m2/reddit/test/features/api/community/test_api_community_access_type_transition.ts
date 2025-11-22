import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformRegisteredUser";

/**
 * Test transitioning community access types between public, restricted, and
 * private.
 *
 * This test validates that member permissions are properly managed during
 * access type changes and that the system handles access control transitions
 * correctly without affecting existing members inappropriately.
 *
 * Test Flow:
 *
 * 1. Create authenticated user account
 * 2. Create community with initial public access type
 * 3. Test transitions: public → restricted → private → public
 * 4. Validate member permissions and access control at each stage
 * 5. Verify data consistency and proper behavior throughout
 */
export async function test_api_community_access_type_transition(
  connection: api.IConnection,
) {
  // Step 1: Create authenticated user account for testing
  const userEmail = typia.random<string & tags.Format<"email">>();
  const user: IRedditPlatformRegisteredUser.IAuthorized =
    await api.functional.auth.registeredUser.join(connection, {
      body: {
        username: `testuser_${RandomGenerator.alphaNumeric(8)}`,
        email: userEmail,
        password: "testpass123",
        display_name: "Test User",
        bio: "Test user for community access type transition testing",
        href: "https://example.com/register",
        referrer: "https://example.com",
      } satisfies IRedditPlatformRegisteredUser.ICreate,
    });
  typia.assert(user);

  // Step 2: Create community with initial public access type
  const communityName = `test_community_${RandomGenerator.alphaNumeric(6)}`;
  const community: IRedditPlatformCommunity =
    await api.functional.redditPlatform.registeredUser.communities.create(
      connection,
      {
        body: {
          name: communityName,
          title: "Test Community for Access Type Transitions",
          description:
            "A test community to validate access type transition behavior",
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
  typia.assert(community);
  TestValidator.equals(
    "initial community type should be public",
    community.type,
    "public",
  );
  TestValidator.equals(
    "community creator should match user",
    community.creator.id,
    user.id,
  );

  // Step 3: Test Public → Restricted transition
  const restrictedUpdate = {
    type: "restricted" as const,
  };
  const restrictedCommunity: IRedditPlatformCommunity =
    await api.functional.redditPlatform.registeredUser.communities.update(
      connection,
      {
        communityName: communityName,
        body: restrictedUpdate satisfies IRedditPlatformCommunity.IUpdate,
      },
    );
  typia.assert(restrictedCommunity);
  TestValidator.equals(
    "community type should be restricted after update",
    restrictedCommunity.type,
    "restricted",
  );
  TestValidator.equals(
    "member count should be preserved",
    restrictedCommunity.member_count,
    community.member_count,
  );
  TestValidator.equals(
    "community creator should remain unchanged",
    restrictedCommunity.creator.id,
    user.id,
  );
  TestValidator.equals(
    "community title should be unchanged",
    restrictedCommunity.title,
    community.title,
  );

  // Step 4: Test Restricted → Private transition
  const privateUpdate = {
    type: "private" as const,
  };
  const privateCommunity: IRedditPlatformCommunity =
    await api.functional.redditPlatform.registeredUser.communities.update(
      connection,
      {
        communityName: communityName,
        body: privateUpdate satisfies IRedditPlatformCommunity.IUpdate,
      },
    );
  typia.assert(privateCommunity);
  TestValidator.equals(
    "community type should be private after update",
    privateCommunity.type,
    "private",
  );
  TestValidator.equals(
    "member count should be preserved during restriction",
    privateCommunity.member_count,
    community.member_count,
  );
  TestValidator.equals(
    "community creator should remain unchanged",
    privateCommunity.creator.id,
    user.id,
  );
  TestValidator.equals(
    "community name should be unchanged",
    privateCommunity.name,
    community.name,
  );

  // Step 5: Test Private → Public transition (back to original)
  const publicUpdate = {
    type: "public" as const,
    title: "Updated Title After Access Type Transitions",
    description:
      "Community description after going through multiple access type changes",
  };
  const finalCommunity: IRedditPlatformCommunity =
    await api.functional.redditPlatform.registeredUser.communities.update(
      connection,
      {
        communityName: communityName,
        body: publicUpdate satisfies IRedditPlatformCommunity.IUpdate,
      },
    );
  typia.assert(finalCommunity);
  TestValidator.equals(
    "community type should be public after final update",
    finalCommunity.type,
    "public",
  );
  TestValidator.equals(
    "member count should be preserved throughout all transitions",
    finalCommunity.member_count,
    community.member_count,
  );
  TestValidator.equals(
    "community creator should remain unchanged",
    finalCommunity.creator.id,
    user.id,
  );
  TestValidator.equals(
    "community name should remain consistent",
    finalCommunity.name,
    community.name,
  );
  TestValidator.equals(
    "community title should be updated",
    finalCommunity.title,
    "Updated Title After Access Type Transitions",
  );
  TestValidator.equals(
    "community description should be updated",
    finalCommunity.description,
    "Community description after going through multiple access type changes",
  );

  // Step 6: Additional validation - test multiple rapid transitions
  await api.functional.redditPlatform.registeredUser.communities.update(
    connection,
    {
      communityName: communityName,
      body: {
        type: "restricted" as const,
        allow_text_posts: false, // Change another property along with type
      } satisfies IRedditPlatformCommunity.IUpdate,
    },
  );

  const afterRapidUpdate: IRedditPlatformCommunity =
    await api.functional.redditPlatform.registeredUser.communities.update(
      connection,
      {
        communityName: communityName,
        body: {
          type: "public" as const,
        } satisfies IRedditPlatformCommunity.IUpdate,
      },
    );
  typia.assert(afterRapidUpdate);
  TestValidator.equals(
    "community should be public after rapid transitions",
    afterRapidUpdate.type,
    "public",
  );
  TestValidator.equals(
    "text posts should be disabled as set",
    afterRapidUpdate.allow_text_posts,
    false,
  );
  TestValidator.equals(
    "member count should persist through rapid changes",
    afterRapidUpdate.member_count,
    community.member_count,
  );

  // Step 7: Validate community status and operational state consistency
  TestValidator.equals(
    "community should remain active",
    afterRapidUpdate.status,
    "active",
  );
  TestValidator.equals(
    "business status should remain consistent",
    afterRapidUpdate.business_status,
    community.business_status,
  );
  TestValidator.equals(
    "subscriber count should be preserved",
    afterRapidUpdate.subscriber_count,
    community.subscriber_count,
  );
  TestValidator.equals(
    "post count should be unchanged",
    afterRapidUpdate.post_count,
    community.post_count,
  );

  // Verify timestamps are updated appropriately
  TestValidator.predicate(
    "updated_at should be later than created_at",
    new Date(afterRapidUpdate.updated_at) >
      new Date(afterRapidUpdate.created_at),
  );
}
