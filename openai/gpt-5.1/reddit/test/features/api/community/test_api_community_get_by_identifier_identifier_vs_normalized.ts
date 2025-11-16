import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountStatus";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityVisibilityLevel } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityVisibilityLevel";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";
import type { ICommunityPlatformPlatformadmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPlatformadmin";

/**
 * Validate case-insensitive community lookup by identifier while preserving
 * original casing.
 *
 * Business goal: Ensure that GET
 * /communityPlatform/communities/{communityIdentifier} can resolve communities
 * by a case-insensitive identifier (through identifier_normalized) but still
 * returns the original identifier casing as stored at creation time. Also
 * verify that visibility level and creator information are consistent.
 *
 * Steps:
 *
 * 1. Register a platform admin account and obtain an authenticated context.
 * 2. As the platform admin, create a dedicated visibility level with a unique code
 *    used only for this test (e.g., "public_case_test").
 * 3. Register a member user account (community creator) and obtain an
 *    authenticated memberUser context.
 * 4. As the member user, create a community with a mixed-case identifier (e.g.,
 *    "MyCommunityCaseTest"), referencing the test visibility level code.
 *    Provide basic title and description and mark isNsfw as false.
 * 5. Build a guest connection (no Authorization header) by cloning the base
 *    connection and clearing headers.
 * 6. From the guest connection, invoke GET
 *    /communityPlatform/communities/{communityIdentifier} using the lowercased
 *    identifier ("mycommunitycasetest"). Assert that:
 *
 *    - The response matches ICommunityPlatformCommunity via typia.assert.
 *    - Response.identifier equals the original mixed-case identifier.
 *    - Response.identifier_normalized equals the lowercased identifier.
 *    - Response.visibilityLevel.code equals the created visibility level code.
 *    - Response.creator.username equals the member user's username.
 *    - Response.is_archived and response.is_removed are false.
 * 7. Call the same GET again with an uppercased identifier ("MYCOMMUNITYCASETEST")
 *    and assert that:
 *
 *    - The returned community id matches the previous call.
 *    - Identifier and identifier_normalized are identical to the first GET.
 *
 * This test focuses purely on business behaviour; it does not assert specific
 * HTTP status codes or type error conditions.
 */
export async function test_api_community_get_by_identifier_identifier_vs_normalized(
  connection: api.IConnection,
) {
  // 1. Register a platform admin to be able to create visibility levels
  const platformAdminJoinBody = {
    username: `admin_${RandomGenerator.alphaNumeric(8)}`,
    email: `admin_${RandomGenerator.alphaNumeric(8)}@example.com`,
    password: "P@ssw0rd!",
    displayName: RandomGenerator.name(),
    ip: undefined,
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const platformAdmin: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinBody,
    });
  typia.assert(platformAdmin);

  // 2. Create a dedicated visibility level as platform admin
  const visibilityCode = `public_case_${RandomGenerator.alphaNumeric(8)}`;

  const visibilityCreateBody = {
    code: visibilityCode,
    name: "Public Case Test Visibility",
    description: RandomGenerator.paragraph({ sentences: 5 }),
  } satisfies ICommunityPlatformCommunityVisibilityLevel.ICreate;

  const visibilityLevel: ICommunityPlatformCommunityVisibilityLevel =
    await api.functional.communityPlatform.platformAdmin.communityVisibilityLevels.create(
      connection,
      {
        body: visibilityCreateBody,
      },
    );
  typia.assert(visibilityLevel);

  TestValidator.equals(
    "created visibility level code matches",
    visibilityLevel.code,
    visibilityCode,
  );

  // 3. Register a member user who will create the community
  const memberJoinBody = {
    username: `member_${RandomGenerator.alphaNumeric(8)}`,
    email: `member_${RandomGenerator.alphaNumeric(8)}@example.com` as string &
      tags.Format<"email">,
    password: "P@ssw0rd!",
    ip: undefined,
    href: "https://app.example.com/join",
    referrer: "https://app.example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  const memberAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorized);

  // 4. As member user, create a community with mixed-case identifier
  const originalIdentifier = "MyCommunityCaseTest";
  const normalizedIdentifier = originalIdentifier.toLowerCase();

  const communityCreateBody = {
    identifier: originalIdentifier,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.paragraph({ sentences: 6 }),
    visibilityLevelCode: visibilityCode,
    isNsfw: false,
    primaryTagIds: undefined,
  } satisfies ICommunityPlatformCommunity.ICreate;

  const createdCommunity: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      {
        body: communityCreateBody,
      },
    );
  typia.assert(createdCommunity);

  TestValidator.equals(
    "created community identifier preserves original casing",
    createdCommunity.identifier,
    originalIdentifier,
  );
  TestValidator.equals(
    "created community normalized identifier is lowercase",
    createdCommunity.identifier_normalized,
    normalizedIdentifier,
  );
  TestValidator.equals(
    "created community visibility code matches",
    createdCommunity.visibilityLevel.code,
    visibilityCode,
  );
  TestValidator.equals(
    "created community creator username matches member",
    createdCommunity.creator.username,
    memberAuthorized.username,
  );

  // 5. Build a guest connection (no Authorization header)
  const guestConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  // 6. Guest GET using lowercase identifier
  const lowerCaseCommunity: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.communities.at(guestConnection, {
      communityIdentifier: normalizedIdentifier,
    });
  typia.assert(lowerCaseCommunity);

  TestValidator.equals(
    "lowercase lookup returns same community id",
    lowerCaseCommunity.id,
    createdCommunity.id,
  );
  TestValidator.equals(
    "lowercase lookup preserves original identifier casing",
    lowerCaseCommunity.identifier,
    originalIdentifier,
  );
  TestValidator.equals(
    "lowercase lookup normalized identifier is lowercase",
    lowerCaseCommunity.identifier_normalized,
    normalizedIdentifier,
  );
  TestValidator.equals(
    "lowercase lookup visibility code matches",
    lowerCaseCommunity.visibilityLevel.code,
    visibilityCode,
  );
  TestValidator.equals(
    "lowercase lookup creator username matches member",
    lowerCaseCommunity.creator.username,
    memberAuthorized.username,
  );
  TestValidator.equals(
    "lowercase lookup is_archived is false",
    lowerCaseCommunity.is_archived,
    false,
  );
  TestValidator.equals(
    "lowercase lookup is_removed is false",
    lowerCaseCommunity.is_removed,
    false,
  );

  // 7. Guest GET using uppercased identifier
  const upperIdentifier = originalIdentifier.toUpperCase();

  const upperCaseCommunity: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.communities.at(guestConnection, {
      communityIdentifier: upperIdentifier,
    });
  typia.assert(upperCaseCommunity);

  TestValidator.equals(
    "uppercase lookup returns same community id",
    upperCaseCommunity.id,
    createdCommunity.id,
  );
  TestValidator.equals(
    "uppercase lookup preserves original identifier casing",
    upperCaseCommunity.identifier,
    originalIdentifier,
  );
  TestValidator.equals(
    "uppercase lookup normalized identifier is lowercase",
    upperCaseCommunity.identifier_normalized,
    normalizedIdentifier,
  );
  TestValidator.equals(
    "uppercase lookup visibility code matches",
    upperCaseCommunity.visibilityLevel.code,
    visibilityCode,
  );
  TestValidator.equals(
    "uppercase lookup creator username matches member",
    upperCaseCommunity.creator.username,
    memberAuthorized.username,
  );
}
