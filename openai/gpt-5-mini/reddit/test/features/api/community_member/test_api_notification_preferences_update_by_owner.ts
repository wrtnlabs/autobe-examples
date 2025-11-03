import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityBbsCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsCommunityMember";
import type { ICommunityBbsNotificationPreference } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsNotificationPreference";

export async function test_api_notification_preferences_update_by_owner(
  connection: api.IConnection,
) {
  /**
   * Validate that a community member can update their own global notification
   * preferences. Steps:
   *
   * 1. Create a fresh community member via join (this issues auth tokens and sets
   *    connection.headers.Authorization automatically by SDK).
   * 2. Attempt to update notification preferences enabling email + daily digest
   *    and in_app notifications.
   * 3. Accept either of two documented platform behaviors regarding enabling email
   *    for unverified email:
   *
   *    - Server rejects with 400 (EMAIL_NOT_VERIFIED), or
   *    - Server accepts and persists preferences but defers deliveries.
   * 4. On success, assert returned ICommunityBbsNotificationPreference values and
   *    that community_member_id matches the created member. Use updated_at
   *    presence as a proxy that the server recorded the change (audit).
   */

  // 1) Create new community member (owner)
  const email = typia.random<string & tags.Format<"email">>();
  const username = `testuser_${RandomGenerator.alphaNumeric(6)}_${Date.now()}`;
  const password = `Aa1${RandomGenerator.alphaNumeric(6)}`; // meets policy: min8 + upper/lower/digit

  const joinBody = {
    email,
    username,
    password,
    profile: {
      display_name: RandomGenerator.name(2),
      bio: RandomGenerator.paragraph({ sentences: 6 }),
      avatar_uri: null,
    },
    session_context: {
      href: "https://example.test/welcome",
      referrer: "https://referrer.test/",
      ip: null,
      session_ttl_seconds: null,
    },
  } satisfies ICommunityBbsCommunityMember.ICreate;

  const authorized: ICommunityBbsCommunityMember.IAuthorized =
    await api.functional.auth.communityMember.join(connection, {
      body: joinBody,
    });
  typia.assert(authorized);

  // Ensure join returned the expected member summary
  TestValidator.equals(
    "joined member username matches request",
    authorized.member.username,
    username,
  );

  // 2) Prepare update payload: enable email+daily digest and in_app
  const updateBody = {
    in_app: true,
    email: true,
    email_frequency: "daily",
    digest_hour: 9,
  } satisfies ICommunityBbsNotificationPreference.IUpdate;

  // 3) Attempt update and handle both possible platform behaviors
  try {
    const pref: ICommunityBbsNotificationPreference =
      await api.functional.communityBbs.communityMember.communityMembers.notificationPreferences.update(
        connection,
        {
          username: authorized.member.username,
          body: updateBody,
        },
      );

    // Success path: server accepted the change
    typia.assert(pref);

    // Business validations
    TestValidator.equals(
      "preferences belong to the created member",
      pref.community_member_id,
      authorized.member.id,
    );

    TestValidator.equals("email preference persisted", pref.email, true);
    TestValidator.equals(
      "email_frequency persisted",
      pref.email_frequency,
      "daily",
    );
    TestValidator.equals("in_app persisted", pref.in_app, true);

    // Audit proxy: updated_at must exist to indicate a recorded change
    TestValidator.predicate(
      "updated_at is present",
      pref.updated_at !== null && pref.updated_at !== undefined,
    );

    // Ensure response shape is limited to preference fields (typia.assert
    // ensures the DTO structure); do not expect sensitive member fields here
    // (no password fields, etc.). typia.assert above already validated shape.
  } catch (exp) {
    // If server rejects enabling email for unverified email, it should throw
    // an HttpError with 400 status per platform policy. The SDK throws
    // runtime HttpError instances; validate that behavior.
    if (exp instanceof api.HttpError) {
      // Accepting 400 as documented rejection for enabling email when
      // email_verified=false. We assert the status code is 400.
      TestValidator.equals(
        "enabling email for unverified address rejected",
        (exp as api.HttpError).status,
        400,
      );
      // Test concluded: server enforced verification guard.
    } else {
      // Re-throw unexpected exceptions so the test harness fails loudly
      throw exp;
    }
  }
}
