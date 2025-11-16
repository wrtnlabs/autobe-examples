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
 * Validate that a member user can retrieve their own profile with community
 * context established.
 *
 * Business context:
 *
 * - A member user registers and authenticates on the community platform.
 * - A platform administrator configures a community visibility level.
 * - The member user creates a community that references that visibility level.
 * - The member user then fetches their own profile using GET
 *   /communityPlatform/memberUser/memberUsers/{memberUserId}.
 *
 * Steps:
 *
 * 1. Register a member user via /auth/memberUser/join and capture their id and
 *    credentials.
 * 2. Register a platform admin via /auth/platformAdmin/join.
 * 3. As platformAdmin, create a community visibility level (e.g., code "public").
 * 4. Log back in as the member user via /auth/memberUser/login (actor switch).
 * 5. As the member user, create a community that uses the created visibility
 *    level.
 * 6. Call memberUsers.at with the member user's own id.
 * 7. Assert the returned ICommunityPlatformMemberuser matches join/login data and
 *    includes accountStatus summary and timestamps, and that no token or
 *    password-like fields are present (implicitly via DTO typing).
 */
export async function test_api_member_user_get_own_profile_with_community_context(
  connection: api.IConnection,
) {
  // 1. Register a member user (join)
  const memberJoinHref: string & tags.Format<"uri"> = typia.random<
    string & tags.Format<"uri">
  >();
  const memberJoinReferrer: string & tags.Format<"uri"> = typia.random<
    string & tags.Format<"uri">
  >();

  const memberPassword = RandomGenerator.alphaNumeric(12);
  const memberJoinBody = {
    username: RandomGenerator.alphabets(12),
    email: typia.random<string & tags.Format<"email">>(),
    password: memberPassword,
    ip: undefined,
    href: memberJoinHref,
    referrer: memberJoinReferrer,
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  const memberAuthorizedFromJoin: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert<ICommunityPlatformMemberuser.IAuthorized>(
    memberAuthorizedFromJoin,
  );

  const memberUserId = memberAuthorizedFromJoin.id;

  // 2. Register a platform admin (join)
  const adminJoinHref: string & tags.Format<"uri"> = typia.random<
    string & tags.Format<"uri">
  >();
  const adminJoinReferrer: string & tags.Format<"uri"> = typia.random<
    string & tags.Format<"uri">
  >();

  const adminPassword = RandomGenerator.alphaNumeric(12);
  const adminJoinBody = {
    username: RandomGenerator.alphabets(10),
    email: typia.random<string & tags.Format<"email">>(),
    password: adminPassword,
    displayName: RandomGenerator.name(),
    ip: undefined,
    href: adminJoinHref,
    referrer: adminJoinReferrer,
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const adminAuthorizedFromJoin: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert<ICommunityPlatformPlatformadmin.IAuthorized>(
    adminAuthorizedFromJoin,
  );

  // 3. As platformAdmin, create a visibility level
  const visibilityCode = "public";
  const visibilityCreateBody = {
    code: visibilityCode,
    name: "Public",
    description: "Publicly visible communities",
  } satisfies ICommunityPlatformCommunityVisibilityLevel.ICreate;

  const visibilityLevel: ICommunityPlatformCommunityVisibilityLevel =
    await api.functional.communityPlatform.platformAdmin.communityVisibilityLevels.create(
      connection,
      {
        body: visibilityCreateBody,
      },
    );
  typia.assert<ICommunityPlatformCommunityVisibilityLevel>(visibilityLevel);

  TestValidator.equals(
    "created visibility level code should match request code",
    visibilityLevel.code,
    visibilityCode,
  );

  // 4. Log back in as member user (actor switch)
  const memberLoginHref: string & tags.Format<"uri"> = typia.random<
    string & tags.Format<"uri">
  >();
  const memberLoginReferrer: string & tags.Format<"uri"> = typia.random<
    string & tags.Format<"uri">
  >();

  const memberLoginBody = {
    identifier: memberJoinBody.email,
    password: memberPassword,
    ip: undefined,
    href: memberLoginHref,
    referrer: memberLoginReferrer,
  } satisfies ICommunityPlatformMemberuser.ILoginRequest;

  const memberAuthorizedFromLogin: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: memberLoginBody,
    });
  typia.assert<ICommunityPlatformMemberuser.IAuthorized>(
    memberAuthorizedFromLogin,
  );

  TestValidator.equals(
    "member id from login should equal id from join",
    memberAuthorizedFromLogin.id,
    memberAuthorizedFromJoin.id,
  );

  // 5. As member user, create a community that uses the created visibility level
  const communityIdentifier = RandomGenerator.alphabets(10);
  const communityTitle = RandomGenerator.name();

  const communityCreateBody = {
    identifier: communityIdentifier,
    title: communityTitle,
    description: undefined,
    visibilityLevelCode: visibilityCode,
    isNsfw: false,
    primaryTagIds: undefined,
  } satisfies ICommunityPlatformCommunity.ICreate;

  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      {
        body: communityCreateBody,
      },
    );
  typia.assert<ICommunityPlatformCommunity>(community);

  TestValidator.equals(
    "community identifier should match request identifier",
    community.identifier,
    communityIdentifier,
  );
  TestValidator.equals(
    "community visibility level code should match created code",
    community.visibilityLevel.code,
    visibilityCode,
  );
  TestValidator.equals(
    "community creator id should match member user id",
    community.creator.id,
    memberUserId,
  );

  // 6. Call memberUsers.at with the member user's own id
  const profile: ICommunityPlatformMemberuser =
    await api.functional.communityPlatform.memberUser.memberUsers.at(
      connection,
      {
        memberUserId: memberUserId,
      },
    );
  typia.assert<ICommunityPlatformMemberuser>(profile);

  // 7. Validate profile fields against join/login data and DTO expectations
  TestValidator.equals(
    "profile id should equal member user id",
    profile.id,
    memberUserId,
  );
  TestValidator.equals(
    "profile username should equal joined username",
    profile.username,
    memberJoinBody.username,
  );
  TestValidator.equals(
    "profile email should equal joined email",
    profile.email,
    memberJoinBody.email,
  );

  // statusCode should be non-empty and consistent with authorized envelope
  TestValidator.equals(
    "profile statusCode should equal authorized statusCode",
    profile.statusCode,
    memberAuthorizedFromLogin.statusCode,
  );

  TestValidator.predicate(
    "profile accountStatus label should be non-empty",
    profile.accountStatus.label.length > 0,
  );

  // createdAt and updatedAt are validated by typia for format; we only ensure non-empty strings
  TestValidator.predicate(
    "profile createdAt should be non-empty string",
    profile.createdAt.length > 0,
  );
  TestValidator.predicate(
    "profile updatedAt should be non-empty string",
    profile.updatedAt.length > 0,
  );
}
