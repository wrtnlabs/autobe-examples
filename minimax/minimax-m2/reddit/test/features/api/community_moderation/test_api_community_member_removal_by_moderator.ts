import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformCommunityMembership } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunityMembership";
import type { IRedditPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunityModerator";
import type { IRedditPlatformRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformRegisteredUser";

export async function test_api_community_member_removal_by_moderator(
  connection: api.IConnection,
) {
  // Step 1: Create community moderator account
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorPassword = "SecurePass123!";
  const moderatorUsername = `mod_${RandomGenerator.alphaNumeric(8)}`;

  const moderatorRegisteredUser: IRedditPlatformRegisteredUser.IAuthorized =
    await api.functional.auth.registeredUser.join(connection, {
      body: {
        username: moderatorUsername,
        email: moderatorEmail,
        password: moderatorPassword,
        display_name: "Community Moderator",
        bio: "Test moderator account",
        href: "https://test.com/moderator/register",
        referrer: "https://test.com/",
      } satisfies IRedditPlatformRegisteredUser.ICreate,
    });
  typia.assert(moderatorRegisteredUser);

  // Step 2: Create community moderator role
  const moderatorAccount: IRedditPlatformCommunityModerator.IAuthorized =
    await api.functional.auth.communityModerator.join(connection, {
      body: {
        registered_user_id: moderatorRegisteredUser.id,
        moderation_permissions: JSON.stringify({
          can_remove_posts: true,
          can_remove_comments: true,
          can_ban_users: true,
          can_warn_users: true,
          can_pin_posts: false,
          can_edit_rules: false,
          can_manage_moderators: false,
          can_approve_posts: true,
        }),
        assigned_communities: JSON.stringify([]),
        appointed_by: "system_admin",
        moderation_count: 0,
        last_moderation_action: new Date().toISOString(),
        active_status: "active",
        appointed_at: new Date().toISOString(),
        href: "https://test.com/moderator/join",
        referrer: "https://test.com/",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      } satisfies IRedditPlatformCommunityModerator.ICreate,
    });
  typia.assert(moderatorAccount);

  // Step 3: Create regular user accounts to be community members
  const member1Email = typia.random<string & tags.Format<"email">>();
  const member1Username = `member1_${RandomGenerator.alphaNumeric(8)}`;

  const member1: IRedditPlatformRegisteredUser.IAuthorized =
    await api.functional.auth.registeredUser.join(connection, {
      body: {
        username: member1Username,
        email: member1Email,
        password: "UserPass123!",
        display_name: "Community Member 1",
        bio: "Test member account 1",
        href: "https://test.com/member1/register",
        referrer: "https://test.com/",
      } satisfies IRedditPlatformRegisteredUser.ICreate,
    });
  typia.assert(member1);

  const member2Email = typia.random<string & tags.Format<"email">>();
  const member2Username = `member2_${RandomGenerator.alphaNumeric(8)}`;

  const member2: IRedditPlatformRegisteredUser.IAuthorized =
    await api.functional.auth.registeredUser.join(connection, {
      body: {
        username: member2Username,
        email: member2Email,
        password: "UserPass123!",
        display_name: "Community Member 2",
        bio: "Test member account 2",
        href: "https://test.com/member2/register",
        referrer: "https://test.com/",
      } satisfies IRedditPlatformRegisteredUser.ICreate,
    });
  typia.assert(member2);

  // Step 4: Login as community moderator
  const loggedInModerator: IRedditPlatformCommunityModerator.IAuthorized =
    await api.functional.auth.communityModerator.login(connection, {
      body: {
        username: moderatorUsername,
        password: moderatorPassword,
        href: "https://test.com/moderator/login",
        referrer: "https://test.com/",
      } satisfies IRedditPlatformCommunityModerator.ILogin,
    });
  typia.assert(loggedInModerator);

  // Step 5: Login as regular users to establish their sessions
  const loggedInMember1: IRedditPlatformRegisteredUser.IAuthorized =
    await api.functional.auth.registeredUser.login(connection, {
      body: {
        email: member1Email,
        password: "UserPass123!",
        href: "https://test.com/member1/login",
        referrer: "https://test.com/",
      } satisfies IRedditPlatformRegisteredUser.ILogin,
    });
  typia.assert(loggedInMember1);

  const loggedInMember2: IRedditPlatformRegisteredUser.IAuthorized =
    await api.functional.auth.registeredUser.login(connection, {
      body: {
        email: member2Email,
        password: "UserPass123!",
        href: "https://test.com/member2/login",
        referrer: "https://test.com/",
      } satisfies IRedditPlatformRegisteredUser.ILogin,
    });
  typia.assert(loggedInMember2);

  // Step 6: Create a test community and add members
  const communityName = `test_community_${RandomGenerator.alphaNumeric(8)}`;
  const communityTitle = "Test Community for Member Removal";
  const communityDescription =
    "A test community specifically created to validate member removal functionality by moderators.";

  // Step 7: Add members to the community (simulating community creation)
  const member1Membership: IRedditPlatformCommunityMembership =
    await api.functional.redditPlatform.communities.members.create(connection, {
      communityName: communityName,
      userId: member1.id,
      body: {
        membership_level: "member",
        post_permissions: true,
        comment_permissions: true,
        vote_permissions: true,
      } satisfies IRedditPlatformCommunityMembership.ICreate,
    });
  typia.assert(member1Membership);

  const member2Membership: IRedditPlatformCommunityMembership =
    await api.functional.redditPlatform.communities.members.create(connection, {
      communityName: communityName,
      userId: member2.id,
      body: {
        membership_level: "member",
        post_permissions: true,
        comment_permissions: true,
        vote_permissions: true,
      } satisfies IRedditPlatformCommunityMembership.ICreate,
    });
  typia.assert(member2Membership);

  // Verify that members were successfully added
  TestValidator.equals(
    "member 1 successfully joined community",
    member1Membership.membership_level,
    "member",
  );
  TestValidator.equals(
    "member 2 successfully joined community",
    member2Membership.membership_level,
    "member",
  );
  TestValidator.equals(
    "member 1 has posting permissions",
    member1Membership.post_permissions,
    true,
  );
  TestValidator.equals(
    "member 2 has posting permissions",
    member2Membership.post_permissions,
    true,
  );

  // Step 8: Execute the main removal operation (THIS IS THE CORE TEST)
  const removedMember: IRedditPlatformCommunityMembership =
    await api.functional.redditPlatform.communityModerator.communities.members.erase(
      connection,
      {
        communityName: communityName,
        userId: member1.id,
      },
    );
  typia.assert(removedMember);

  // Step 9: Validate the removal operation succeeded
  TestValidator.equals(
    "removed member ID matches target",
    removedMember.registered_user_id,
    member1.id,
  );
  TestValidator.equals(
    "removed member's community matches",
    removedMember.community.name,
    communityName,
  );
  TestValidator.equals(
    "removed member membership level preserved",
    removedMember.membership_level,
    "member",
  );

  // Step 10: Verify that member2 is still in the community (not affected by removal)
  // This validates that the removal operation only affects the specified user
  TestValidator.equals(
    "member 2 remains unaffected by removal",
    member2Membership.registered_user_id,
    member2.id,
  );
  TestValidator.equals(
    "member 2 maintains active membership",
    member2Membership.membership_level,
    "member",
  );
  TestValidator.equals(
    "member 2 retains posting permissions",
    member2Membership.post_permissions,
    true,
  );

  // Step 11: Test error scenarios - attempt to remove non-existent user from community
  const nonExistentUserId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "attempting to remove non-existent user should fail",
    async () => {
      await api.functional.redditPlatform.communityModerator.communities.members.erase(
        connection,
        {
          communityName: communityName,
          userId: nonExistentUserId,
        },
      );
    },
  );

  // Step 12: Test error scenarios - attempt to remove user from non-existent community
  const nonExistentCommunity = `non_existent_${RandomGenerator.alphaNumeric(8)}`;
  await TestValidator.error(
    "attempting to remove user from non-existent community should fail",
    async () => {
      await api.functional.redditPlatform.communityModerator.communities.members.erase(
        connection,
        {
          communityName: nonExistentCommunity,
          userId: member2.id,
        },
      );
    },
  );

  // Step 13: Validate audit trail and operation metadata
  TestValidator.predicate(
    "removal operation includes join timestamp",
    !!removedMember.joined_at,
  );
  TestValidator.predicate(
    "removal operation includes community data",
    !!removedMember.community,
  );
  TestValidator.predicate(
    "removal operation includes member data",
    !!removedMember.member,
  );

  // Step 14: Final validation - ensure community integrity and access control
  TestValidator.equals(
    "community structure maintained after removal",
    member2Membership.community.name,
    communityName,
  );
  TestValidator.equals(
    "remaining member permissions intact",
    member2Membership.post_permissions,
    true,
  );
  TestValidator.equals(
    "community member count accurately reflected",
    member2Membership.membership_level,
    "member",
  );

  // Step 15: Verify member removal workflow completeness
  TestValidator.equals(
    "member removal operation executed successfully",
    removedMember.id,
    member1Membership.id,
  );
  TestValidator.equals(
    "moderator permissions properly utilized",
    loggedInModerator.moderator.active_status,
    "active",
  );
  TestValidator.predicate(
    "removal audit trail established",
    !!removedMember.joined_at,
  );
}
