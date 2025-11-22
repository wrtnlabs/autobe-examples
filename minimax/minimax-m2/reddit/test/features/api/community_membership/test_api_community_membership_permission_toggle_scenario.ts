import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformCommunityMembership } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunityMembership";
import type { IRedditPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunityModerator";
import type { IRedditPlatformRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformRegisteredUser";

export async function test_api_community_membership_permission_toggle_scenario(
  connection: api.IConnection,
) {
  // Create a test community name - in real scenario, this would be created by moderator
  const communityName = `test_community_${RandomGenerator.alphaNumeric(8)}`;

  // Create and register a user for permission testing
  const userEmail = typia.random<string & tags.Format<"email">>();
  const userPassword = RandomGenerator.alphabets(8);
  const registeredUser = await api.functional.auth.registeredUser.join(
    connection,
    {
      body: {
        username: `user_${RandomGenerator.alphaNumeric(6)}`,
        email: userEmail,
        password: userPassword,
        display_name: RandomGenerator.name(),
        bio: RandomGenerator.paragraph(),
        location: RandomGenerator.alphabets(10),
        website_url: `https://example.com/${RandomGenerator.alphaNumeric(5)}`,
        avatar_url: `https://example.com/avatar/${RandomGenerator.alphaNumeric(5)}.jpg`,
        ip: "127.0.0.1",
        href: "http://localhost:3000/test",
        referrer: "http://localhost:3000/test",
      } satisfies IRedditPlatformRegisteredUser.ICreate,
    },
  );
  typia.assert(registeredUser);

  // Login as the registered user to establish session
  const userAuth = await api.functional.auth.registeredUser.login(connection, {
    body: {
      email: userEmail,
      password: userPassword,
      ip: "127.0.0.1",
      href: "http://localhost:3000/test",
      referrer: "http://localhost:3000/test",
    } satisfies IRedditPlatformRegisteredUser.ILogin,
  });
  typia.assert(userAuth);

  // Create user membership in the test community
  // Note: In a real test environment, the community would need to exist beforehand
  // For this E2E test, we simulate the membership creation process
  const membership =
    await api.functional.redditPlatform.communities.members.create(connection, {
      communityName: communityName,
      userId: registeredUser.id,
      body: {
        membership_level: "member", // Start as regular member
        post_permissions: true,
        comment_permissions: true,
        vote_permissions: true,
      } satisfies IRedditPlatformCommunityMembership.ICreate,
    });
  typia.assert(membership);

  TestValidator.equals(
    "initial membership level should be member",
    membership.membership_level,
    "member",
  );
  TestValidator.equals(
    "initial post permissions should be enabled",
    membership.post_permissions,
    true,
  );
  TestValidator.equals(
    "initial comment permissions should be enabled",
    membership.comment_permissions,
    true,
  );
  TestValidator.equals(
    "initial vote permissions should be enabled",
    membership.vote_permissions,
    true,
  );

  // Test 1: Toggle post permissions off while maintaining member level
  const updatedMembership1 =
    await api.functional.redditPlatform.registeredUser.communities.members.update(
      connection,
      {
        communityName: communityName,
        userId: registeredUser.id,
        body: {
          post_permissions: false, // Disable posting
        } satisfies IRedditPlatformCommunityMembership.IUpdate,
      },
    );
  typia.assert(updatedMembership1);

  TestValidator.equals(
    "membership level should remain member",
    updatedMembership1.membership_level,
    "member",
  );
  TestValidator.equals(
    "post permissions should be disabled",
    updatedMembership1.post_permissions,
    false,
  );
  TestValidator.equals(
    "comment permissions should remain enabled",
    updatedMembership1.comment_permissions,
    true,
  );
  TestValidator.equals(
    "vote permissions should remain enabled",
    updatedMembership1.vote_permissions,
    true,
  );

  // Test 2: Toggle comment permissions off while keeping post off
  const updatedMembership2 =
    await api.functional.redditPlatform.registeredUser.communities.members.update(
      connection,
      {
        communityName: communityName,
        userId: registeredUser.id,
        body: {
          comment_permissions: false, // Disable comments
        } satisfies IRedditPlatformCommunityMembership.IUpdate,
      },
    );
  typia.assert(updatedMembership2);

  TestValidator.equals(
    "membership level should still be member",
    updatedMembership2.membership_level,
    "member",
  );
  TestValidator.equals(
    "post permissions should remain disabled",
    updatedMembership2.post_permissions,
    false,
  );
  TestValidator.equals(
    "comment permissions should be disabled",
    updatedMembership2.comment_permissions,
    false,
  );
  TestValidator.equals(
    "vote permissions should remain enabled",
    updatedMembership2.vote_permissions,
    true,
  );

  // Test 3: Re-enable post permissions while keeping comments off
  const updatedMembership3 =
    await api.functional.redditPlatform.registeredUser.communities.members.update(
      connection,
      {
        communityName: communityName,
        userId: registeredUser.id,
        body: {
          post_permissions: true, // Re-enable posting
        } satisfies IRedditPlatformCommunityMembership.IUpdate,
      },
    );
  typia.assert(updatedMembership3);

  TestValidator.equals(
    "membership level should still be member",
    updatedMembership3.membership_level,
    "member",
  );
  TestValidator.equals(
    "post permissions should be re-enabled",
    updatedMembership3.post_permissions,
    true,
  );
  TestValidator.equals(
    "comment permissions should remain disabled",
    updatedMembership3.comment_permissions,
    false,
  );
  TestValidator.equals(
    "vote permissions should remain enabled",
    updatedMembership3.vote_permissions,
    true,
  );

  // Test 4: Toggle vote permissions off while keeping other settings
  const updatedMembership4 =
    await api.functional.redditPlatform.registeredUser.communities.members.update(
      connection,
      {
        communityName: communityName,
        userId: registeredUser.id,
        body: {
          vote_permissions: false, // Disable voting
        } satisfies IRedditPlatformCommunityMembership.IUpdate,
      },
    );
  typia.assert(updatedMembership4);

  TestValidator.equals(
    "membership level should still be member",
    updatedMembership4.membership_level,
    "member",
  );
  TestValidator.equals(
    "post permissions should remain enabled",
    updatedMembership4.post_permissions,
    true,
  );
  TestValidator.equals(
    "comment permissions should remain disabled",
    updatedMembership4.comment_permissions,
    false,
  );
  TestValidator.equals(
    "vote permissions should be disabled",
    updatedMembership4.vote_permissions,
    false,
  );

  // Test 5: Re-enable all permissions at once
  const updatedMembership5 =
    await api.functional.redditPlatform.registeredUser.communities.members.update(
      connection,
      {
        communityName: communityName,
        userId: registeredUser.id,
        body: {
          post_permissions: true,
          comment_permissions: true,
          vote_permissions: true,
        } satisfies IRedditPlatformCommunityMembership.IUpdate,
      },
    );
  typia.assert(updatedMembership5);

  TestValidator.equals(
    "membership level should still be member",
    updatedMembership5.membership_level,
    "member",
  );
  TestValidator.equals(
    "post permissions should be re-enabled",
    updatedMembership5.post_permissions,
    true,
  );
  TestValidator.equals(
    "comment permissions should be re-enabled",
    updatedMembership5.comment_permissions,
    true,
  );
  TestValidator.equals(
    "vote permissions should be re-enabled",
    updatedMembership5.vote_permissions,
    true,
  );

  // Test 6: Validate community and member info are preserved
  TestValidator.equals(
    "community info should be preserved",
    updatedMembership5.community.name,
    communityName,
  );
  TestValidator.equals(
    "member info should be preserved",
    updatedMembership5.member.username,
    registeredUser.username,
  );

  // Test 7: Toggle to minimal permissions (no posting, no commenting, no voting)
  const minimalMembership =
    await api.functional.redditPlatform.registeredUser.communities.members.update(
      connection,
      {
        communityName: communityName,
        userId: registeredUser.id,
        body: {
          post_permissions: false,
          comment_permissions: false,
          vote_permissions: false,
        } satisfies IRedditPlatformCommunityMembership.IUpdate,
      },
    );
  typia.assert(minimalMembership);

  TestValidator.equals(
    "membership level should remain member even with no permissions",
    minimalMembership.membership_level,
    "member",
  );
  TestValidator.equals(
    "all permissions should be disabled",
    minimalMembership.post_permissions,
    false,
  );
  TestValidator.equals(
    "all permissions should be disabled",
    minimalMembership.comment_permissions,
    false,
  );
  TestValidator.equals(
    "all permissions should be disabled",
    minimalMembership.vote_permissions,
    false,
  );

  // Test 8: Test that permissions can still be modified from minimal state
  const restoredMembership =
    await api.functional.redditPlatform.registeredUser.communities.members.update(
      connection,
      {
        communityName: communityName,
        userId: registeredUser.id,
        body: {
          post_permissions: true, // Can still enable posting
        } satisfies IRedditPlatformCommunityMembership.IUpdate,
      },
    );
  typia.assert(restoredMembership);

  TestValidator.equals(
    "can re-enable permissions from minimal state",
    restoredMembership.post_permissions,
    true,
  );
  TestValidator.equals(
    "comment permissions should still be disabled",
    restoredMembership.comment_permissions,
    false,
  );
  TestValidator.equals(
    "vote permissions should still be disabled",
    restoredMembership.vote_permissions,
    false,
  );

  // Test 9: Verify the membership ID remains consistent throughout toggling
  TestValidator.equals(
    "membership ID should remain consistent",
    updatedMembership5.id,
    membership.id,
  );
  TestValidator.equals(
    "joined timestamp should be preserved",
    updatedMembership5.joined_at,
    membership.joined_at,
  );

  // Test 10: Final validation - verify the complete toggle cycle worked correctly
  const finalMembership =
    await api.functional.redditPlatform.registeredUser.communities.members.update(
      connection,
      {
        communityName: communityName,
        userId: registeredUser.id,
        body: {
          post_permissions: true,
          comment_permissions: true,
          vote_permissions: true,
        } satisfies IRedditPlatformCommunityMembership.IUpdate,
      },
    );
  typia.assert(finalMembership);

  TestValidator.equals(
    "final state should have all permissions enabled",
    finalMembership.post_permissions,
    true,
  );
  TestValidator.equals(
    "final state should have all permissions enabled",
    finalMembership.comment_permissions,
    true,
  );
  TestValidator.equals(
    "final state should have all permissions enabled",
    finalMembership.vote_permissions,
    true,
  );
  TestValidator.equals(
    "final membership level should be member",
    finalMembership.membership_level,
    "member",
  );
  TestValidator.equals(
    "final membership should match original user",
    finalMembership.member.id,
    registeredUser.id,
  );
  TestValidator.equals(
    "final membership should match original community",
    finalMembership.community.name,
    communityName,
  );
}
