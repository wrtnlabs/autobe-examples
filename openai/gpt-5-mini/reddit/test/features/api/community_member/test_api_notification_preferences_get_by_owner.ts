import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityBbsCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsCommunityMember";
import type { ICommunityBbsNotificationPreference } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsNotificationPreference";

export async function test_api_notification_preferences_get_by_owner(
  connection: api.IConnection,
) {
  /**
   * Validate that a community member can retrieve their own notification
   * preferences.
   *
   * Steps:
   *
   * 1. Create a fresh community member via POST /auth/communityMember/join to
   *    receive IAuthorized (member + token + session). The SDK helper sets the
   *    Authorization header on the connection automatically.
   * 2. Call GET
   *    /communityBbs/communityMember/communityMembers/{username}/notificationPreferences
   *    with the member's username using the same connection.
   * 3. Assert the returned ICommunityBbsNotificationPreference DTO with
   *    typia.assert and perform business-level validations using
   *    TestValidator.
   */

  // 1) Create a fresh community member (owner)
  const username = `owner_${RandomGenerator.alphaNumeric(6)}`;
  const email = `${username}@example.test`;

  const joinBody = {
    email,
    username,
    password: "Passw0rd!", // satisfies password policy: min 8, upper/lower/digit
    display_name: RandomGenerator.name(),
    profile: {
      display_name: RandomGenerator.name(1),
      bio: RandomGenerator.paragraph({ sentences: 6 }),
      avatar_uri: undefined,
    },
    session_context: {
      href: `https://example.test/welcome/${username}`,
      referrer: `https://referrer.test/`,
      // optional fields intentionally omitted to use server defaults
    },
  } satisfies ICommunityBbsCommunityMember.ICreate;

  const authorized: ICommunityBbsCommunityMember.IAuthorized =
    await api.functional.auth.communityMember.join(connection, {
      body: joinBody,
    });
  // Runtime type validation
  typia.assert(authorized);

  const owner = authorized.member;
  typia.assert(owner);

  // 2) Retrieve notification preferences as the owner
  const prefs: ICommunityBbsNotificationPreference =
    await api.functional.communityBbs.communityMember.communityMembers.notificationPreferences.at(
      connection,
      {
        username: owner.username,
      },
    );
  typia.assert(prefs);

  // 3) Business validations
  // Required boolean fields must be present and booleans
  TestValidator.predicate(
    "notification preferences: in_app is boolean",
    typeof prefs.in_app === "boolean",
  );
  TestValidator.predicate(
    "notification preferences: email is boolean",
    typeof prefs.email === "boolean",
  );
  TestValidator.predicate(
    "notification preferences: push is boolean",
    typeof prefs.push === "boolean",
  );

  // email_frequency must be one of allowed values or undefined
  TestValidator.predicate(
    "notification preferences: email_frequency is valid or undefined",
    prefs.email_frequency === undefined ||
      prefs.email_frequency === "immediate" ||
      prefs.email_frequency === "hourly" ||
      prefs.email_frequency === "daily",
  );

  // digest_hour must be null/undefined or a number between 0 and 23
  TestValidator.predicate(
    "notification preferences: digest_hour is null|undef|0-23",
    prefs.digest_hour === null ||
      prefs.digest_hour === undefined ||
      (typeof prefs.digest_hour === "number" &&
        prefs.digest_hour >= 0 &&
        prefs.digest_hour <= 23),
  );

  // Ensure the returned DTO does not contain sensitive member-side fields
  // that should never be present on this preferences DTO (defensive check)
  TestValidator.predicate(
    "notification preferences: does not leak sensitive fields",
    !(
      "password_hash" in (prefs as any) ||
      "token" in (prefs as any) ||
      "session" in (prefs as any) ||
      "email_address" in (prefs as any)
    ),
  );
}
