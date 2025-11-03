import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityBbsCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsCommunityMember";
import type { ICommunityBbsProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsProfile";

export async function test_api_community_member_profile_public_retrieval(
  connection: api.IConnection,
) {
  /**
   * Validate public profile retrieval flow for a community member. Steps:
   *
   * 1. Register (join) a new community member with initial profile data
   * 2. Update the member's public profile via authenticated endpoint
   * 3. Retrieve the profile as an unauthenticated caller and validate public
   *    fields
   * 4. Verify sensitive fields are not exposed
   * 5. Ensure non-existent username returns an error
   */

  // 1) Create unique test credentials that match DTO constraints
  const username = `alice_tester_${RandomGenerator.alphaNumeric(6)}`; // total length <= 21
  const email = `${username}@example.test`;
  const password = "Passw0rd!"; // meets pattern: min 8, includes upper/lower/digit

  const initialDisplayName = `Alice ${RandomGenerator.name(1)}`;
  const initialBio = RandomGenerator.paragraph({
    sentences: 6,
    wordMin: 3,
    wordMax: 8,
  });
  const initialAvatar = `https://example.test/avatars/${RandomGenerator.alphaNumeric(8)}.png`;

  // 2) Join as community member (will set Authorization header on connection)
  const authorized: ICommunityBbsCommunityMember.IAuthorized =
    await api.functional.auth.communityMember.join(connection, {
      body: {
        email,
        username,
        password,
        profile: {
          display_name: initialDisplayName,
          bio: initialBio,
          avatar_uri: initialAvatar,
        },
        session_context: {
          href: typia.random<string & tags.Format<"uri">>(),
          referrer: typia.random<string & tags.Format<"uri">>(),
          ip: null,
          session_ttl_seconds: null,
        },
      } satisfies ICommunityBbsCommunityMember.ICreate,
    });
  typia.assert(authorized);

  TestValidator.predicate(
    "join returned member and tokens",
    !!authorized.member && !!authorized.token && !!authorized.session,
  );

  // 3) Update public profile via authenticated endpoint
  const updatedDisplayName = `${initialDisplayName} (updated)`;
  const updatedBio = `${initialBio}\n\nUpdated at ${new Date().toISOString()}`;
  const updatedAvatar = `https://example.test/avatars/${RandomGenerator.alphaNumeric(8)}.png`;

  const updatedProfile: ICommunityBbsProfile =
    await api.functional.communityBbs.communityMember.communityMembers.profile.update(
      connection,
      {
        username,
        body: {
          display_name: updatedDisplayName,
          bio: updatedBio,
          avatar_uri: updatedAvatar,
        } satisfies ICommunityBbsProfile.IUpdate,
      },
    );
  typia.assert(updatedProfile);

  TestValidator.equals(
    "profile owner username matches after update",
    updatedProfile.member.username,
    username,
  );
  TestValidator.equals(
    "profile display name updated",
    updatedProfile.display_name,
    updatedDisplayName,
  );

  // 4) Fetch profile as unauthenticated caller
  const unauthConn: api.IConnection = { ...connection, headers: {} };

  const publicProfile: ICommunityBbsProfile =
    await api.functional.communityBbs.communityMembers.profile.at(unauthConn, {
      username,
    });
  typia.assert(publicProfile);

  // 5) Validate public fields
  TestValidator.equals(
    "public profile display name matches",
    publicProfile.display_name,
    updatedDisplayName,
  );
  TestValidator.equals(
    "public profile bio matches",
    publicProfile.bio,
    updatedBio,
  );
  TestValidator.equals(
    "public profile member username matches",
    publicProfile.member.username,
    username,
  );

  TestValidator.predicate(
    "avatar URI looks like an https URL",
    typeof publicProfile.avatar_uri === "string" &&
      publicProfile.avatar_uri.startsWith("https://"),
  );

  // Sensitive fields must NOT be present in public member summary
  // Use a safe runtime check by treating member as a generic record
  const memberObj = publicProfile.member as unknown as Record<string, unknown>;
  TestValidator.predicate(
    "public member summary hides email",
    !("email" in memberObj),
  );
  TestValidator.predicate(
    "public member summary hides password_hash",
    !("password_hash" in memberObj),
  );

  // 6) Error case: non-existent username should throw (do not assert status code)
  await TestValidator.error("non-existent username should fail", async () => {
    await api.functional.communityBbs.communityMembers.profile.at(unauthConn, {
      username: `nonexistent_user_${RandomGenerator.alphaNumeric(8)}`,
    });
  });

  // Note: Soft-delete and privacy flags are server-controlled states that
  // cannot be reliably induced via available SDK functions in this test. If
  // the product marks profiles private or soft-deletes them, GET behavior may
  // return 403 or 404 and should be covered by dedicated admin/moderation tests.
}
