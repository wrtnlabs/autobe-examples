import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconDiscussMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussMember";
import type { IEconDiscussUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussUserProfile";

/**
 * Validate public retrieval of a user's extended profile.
 *
 * Steps:
 *
 * 1. Register a new member to obtain userId and authenticated context.
 * 2. Update the member's public profile fields to ensure a persisted profile.
 * 3. Fetch the profile publicly (without Authorization) and verify fields.
 *
 * Business rules validated:
 *
 * - Public endpoint does not require Authorization header
 * - Returned profile reflects latest updates on public-safe fields
 * - Response conforms to schema (UUIDs and ISO timestamps guaranteed by
 *   typia.assert)
 */
export async function test_api_user_profile_public_view_success(
  connection: api.IConnection,
) {
  // 1) Register a new member (join)
  const email: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const password: string = RandomGenerator.alphaNumeric(12); // >= 8 chars
  const displayNameOnJoin: string = RandomGenerator.name(2);
  const avatarOnJoin: string & tags.Format<"uri"> = typia.random<
    string & tags.Format<"uri">
  >();

  const joinBody = {
    email,
    password,
    display_name: displayNameOnJoin,
    timezone: "Asia/Seoul",
    locale: "en-US",
    avatar_uri: avatarOnJoin,
  } satisfies IEconDiscussMember.ICreate;

  const auth: IEconDiscussMember.IAuthorized =
    await api.functional.auth.member.join(connection, { body: joinBody });
  typia.assert(auth);
  const userId: string & tags.Format<"uuid"> = auth.id;

  // 2) Update my profile (authenticated via SDK’s automatic token handling)
  const updatedDisplayName: string = RandomGenerator.name(1);
  const updatedAvatarUri: string & tags.Format<"uri"> = typia.random<
    string & tags.Format<"uri">
  >();
  const updatedTimezone: string = "Asia/Seoul";
  const updatedLocale: string = "en-US";
  const updatedBio: string = RandomGenerator.paragraph({ sentences: 8 });
  const updatedAffiliation: string = RandomGenerator.paragraph({
    sentences: 3,
  });
  const updatedWebsite: string & tags.Format<"uri"> = typia.random<
    string & tags.Format<"uri">
  >();
  const updatedLocation: string = RandomGenerator.paragraph({ sentences: 2 });

  const profileUpdateBody = {
    displayName: updatedDisplayName,
    avatarUri: updatedAvatarUri,
    timezone: updatedTimezone,
    locale: updatedLocale,
    bio: updatedBio,
    affiliation: updatedAffiliation,
    website: updatedWebsite,
    location: updatedLocation,
  } satisfies IEconDiscussUserProfile.IUpdate;

  const updatedProfile: IEconDiscussUserProfile =
    await api.functional.econDiscuss.member.me.profile.update(connection, {
      body: profileUpdateBody,
    });
  typia.assert(updatedProfile);

  // Sanity assertions against update result
  TestValidator.equals(
    "updated profile id equals auth.id",
    updatedProfile.id,
    userId,
  );
  TestValidator.equals(
    "displayName should reflect update",
    updatedProfile.displayName,
    updatedDisplayName,
  );
  TestValidator.equals(
    "avatarUri should reflect update",
    updatedProfile.avatarUri,
    updatedAvatarUri,
  );
  TestValidator.equals(
    "timezone should reflect update",
    updatedProfile.timezone,
    updatedTimezone,
  );
  TestValidator.equals(
    "locale should reflect update",
    updatedProfile.locale,
    updatedLocale,
  );
  TestValidator.equals(
    "bio should reflect update",
    updatedProfile.bio,
    updatedBio,
  );
  TestValidator.equals(
    "affiliation should reflect update",
    updatedProfile.affiliation,
    updatedAffiliation,
  );
  TestValidator.equals(
    "website should reflect update",
    updatedProfile.website,
    updatedWebsite,
  );
  TestValidator.equals(
    "location should reflect update",
    updatedProfile.location,
    updatedLocation,
  );
  if (updatedProfile.reputation !== undefined) {
    TestValidator.predicate(
      "reputation, when present, must be non-negative",
      updatedProfile.reputation >= 0,
    );
  }

  // 3) Public fetch without Authorization header
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  const publicProfile: IEconDiscussUserProfile =
    await api.functional.econDiscuss.users.profile.at(unauthConn, {
      userId,
    });
  typia.assert(publicProfile);

  // Validate equality to updated values
  TestValidator.equals(
    "public profile id matches userId",
    publicProfile.id,
    userId,
  );
  TestValidator.equals(
    "public displayName equals updated",
    publicProfile.displayName,
    updatedDisplayName,
  );
  TestValidator.equals(
    "public avatarUri equals updated",
    publicProfile.avatarUri,
    updatedAvatarUri,
  );
  TestValidator.equals(
    "public timezone equals updated",
    publicProfile.timezone,
    updatedTimezone,
  );
  TestValidator.equals(
    "public locale equals updated",
    publicProfile.locale,
    updatedLocale,
  );
  TestValidator.equals(
    "public bio equals updated",
    publicProfile.bio,
    updatedBio,
  );
  TestValidator.equals(
    "public affiliation equals updated",
    publicProfile.affiliation,
    updatedAffiliation,
  );
  TestValidator.equals(
    "public website equals updated",
    publicProfile.website,
    updatedWebsite,
  );
  TestValidator.equals(
    "public location equals updated",
    publicProfile.location,
    updatedLocation,
  );
}
