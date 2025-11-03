import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityBbsCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsCommunityMember";
import type { ICommunityBbsNotificationPreference } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsNotificationPreference";

/**
 * Validate that a community member cannot retrieve another member's private
 * notification preferences.
 *
 * Business context: Community members have private notification preferences
 * that should only be viewable by the owning member (or a system
 * administrator). This test ensures that an authenticated non-owner cannot
 * access another member's preferences.
 *
 * Steps:
 *
 * 1. Create 'owner' community member via POST /auth/communityMember/join
 * 2. Create 'requester' community member via POST /auth/communityMember/join
 * 3. Confirm the owner can retrieve their own notification preferences (positive
 *    control).
 * 4. Using the requester's authentication, attempt to retrieve the owner's
 *    notification preferences and assert that the call throws (access denied).
 */
export async function test_api_notification_preferences_get_forbidden_non_owner(
  connection: api.IConnection,
) {
  // 1. Create owner account (isolated connection with empty headers)
  const ownerConn: api.IConnection = { ...connection, headers: {} };

  const ownerUsername = `owner_${RandomGenerator.alphaNumeric(6)}`;
  const ownerEmail = `${ownerUsername}@example.test`;
  const ownerPassword = "Passw0rd!"; // Meets policy: min 8, upper, lower, digit

  const ownerAuth: ICommunityBbsCommunityMember.IAuthorized =
    await api.functional.auth.communityMember.join(ownerConn, {
      body: {
        email: ownerEmail,
        username: ownerUsername,
        password: ownerPassword,
        profile: {
          display_name: RandomGenerator.name(2),
        },
        session_context: {
          href: `https://example.test/${RandomGenerator.alphaNumeric(6)}`,
          referrer: `https://ref.example.test/${RandomGenerator.alphaNumeric(6)}`,
          ip: RandomGenerator.mobile(),
        },
      } satisfies ICommunityBbsCommunityMember.ICreate,
    });
  typia.assert(ownerAuth);

  // 2. Create requester account (another isolated connection)
  const requesterConn: api.IConnection = { ...connection, headers: {} };

  const requesterUsername = `guest_${RandomGenerator.alphaNumeric(6)}`;
  const requesterEmail = `${requesterUsername}@example.test`;
  const requesterPassword = "Passw0rd!";

  const requesterAuth: ICommunityBbsCommunityMember.IAuthorized =
    await api.functional.auth.communityMember.join(requesterConn, {
      body: {
        email: requesterEmail,
        username: requesterUsername,
        password: requesterPassword,
        profile: {
          display_name: RandomGenerator.name(2),
        },
        session_context: {
          href: `https://example.test/${RandomGenerator.alphaNumeric(6)}`,
          referrer: `https://ref.example.test/${RandomGenerator.alphaNumeric(6)}`,
          ip: RandomGenerator.mobile(),
        },
      } satisfies ICommunityBbsCommunityMember.ICreate,
    });
  typia.assert(requesterAuth);

  // Positive control: owner can retrieve their own preferences
  const ownerPrefs: ICommunityBbsNotificationPreference =
    await api.functional.communityBbs.communityMember.communityMembers.notificationPreferences.at(
      ownerConn,
      {
        username: ownerAuth.member.username,
      },
    );
  typia.assert(ownerPrefs);

  // The returned preferences must reference the owner's member id
  TestValidator.equals(
    "owner can retrieve own preferences: community_member_id matches",
    ownerPrefs.community_member_id,
    ownerAuth.member.id,
  );

  // Negative test: requester (non-owner) must NOT be able to retrieve owner's prefs
  await TestValidator.error(
    "non-owner requester cannot retrieve another member's notification preferences",
    async () => {
      await api.functional.communityBbs.communityMember.communityMembers.notificationPreferences.at(
        requesterConn,
        {
          username: ownerAuth.member.username,
        },
      );
    },
  );
}
