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

export async function test_api_member_user_profile_update_with_existing_community(
  connection: api.IConnection,
) {
  // 1. Join as a new member user (this also authenticates the connection as memberUser)
  const memberJoinBody = {
    username: RandomGenerator.name(1),
    email: `member_${RandomGenerator.alphaNumeric(8)}@example.com`,
    password: RandomGenerator.alphaNumeric(12),
    // minimal but valid session context
    href: "https://member.example.com/join",
    referrer: "https://member.example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  const memberAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorized);

  // Capture immutable baseline fields from the authorized snapshot
  const beforeMemberId = memberAuthorized.id;
  const beforeUsername = memberAuthorized.username;
  const beforeEmail = memberAuthorized.email;
  const beforeStatusCode = memberAuthorized.statusCode;
  const beforeCreatedAt = memberAuthorized.createdAt;
  const beforeUpdatedAt = memberAuthorized.updatedAt;

  // 2. Register a platform admin and authenticate as platformAdmin
  const adminJoinBody = {
    username: `admin_${RandomGenerator.alphaNumeric(6)}`,
    email: `admin_${RandomGenerator.alphaNumeric(8)}@example.com`,
    password: RandomGenerator.alphaNumeric(12),
    displayName: RandomGenerator.name(2),
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const platformAdminAuthorized: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(platformAdminAuthorized);

  // Explicit login as platformAdmin to simulate actor switching flow
  const platformAdminLoginBody = {
    identifier: adminJoinBody.email,
    password: adminJoinBody.password,
    href: "https://admin.example.com/login",
    referrer: "https://admin.example.com/landing",
  } satisfies ICommunityPlatformPlatformadmin.ILogin;

  const platformAdminLogin: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: platformAdminLoginBody,
    });
  typia.assert(platformAdminLogin);

  // 3. As platformAdmin, create a visibility level definition
  const visibilityCode = `vis_${RandomGenerator.alphaNumeric(6)}`;
  const visibilityCreateBody = {
    code: visibilityCode,
    name: "Public Visibility",
    description: RandomGenerator.paragraph({ sentences: 4 }),
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
    "created visibility level code should match request",
    visibilityLevel.code,
    visibilityCreateBody.code,
  );

  // 4. Switch auth context back to the member user via memberUser login
  const memberLoginBody = {
    identifier: memberJoinBody.email,
    password: memberJoinBody.password,
    href: "https://member.example.com/login",
    referrer: "https://member.example.com/landing",
  } satisfies ICommunityPlatformMemberuser.ILoginRequest;

  const memberLogin: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: memberLoginBody,
    });
  typia.assert(memberLogin);

  TestValidator.equals(
    "logged-in member id should match joined member id",
    memberLogin.id,
    beforeMemberId,
  );

  // 5. As memberUser, create a community using the visibility level code
  const communityCreateBody = {
    identifier: `comm_${RandomGenerator.alphaNumeric(6)}`,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.paragraph({ sentences: 6 }),
    visibilityLevelCode: visibilityLevel.code,
    isNsfw: false,
  } satisfies ICommunityPlatformCommunity.ICreate;

  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      {
        body: communityCreateBody,
      },
    );
  typia.assert(community);

  TestValidator.equals(
    "community identifier should match request",
    community.identifier,
    communityCreateBody.identifier,
  );
  TestValidator.equals(
    "community creator id should be the member user",
    community.creator.id,
    beforeMemberId,
  );

  // 6. Perform the profile update for the member user
  const newDisplayName = RandomGenerator.name(2);
  const newBio = RandomGenerator.paragraph({ sentences: 8 });
  const newAvatarUrl =
    "https://cdn.example.com/avatars/" +
    RandomGenerator.alphaNumeric(12) +
    ".png";

  const updateBody = {
    displayName: newDisplayName,
    bio: newBio,
    avatarUrl: newAvatarUrl,
  } satisfies ICommunityPlatformMemberuser.IUpdate;

  const updatedMember: ICommunityPlatformMemberuser =
    await api.functional.communityPlatform.memberUser.memberUsers.update(
      connection,
      {
        memberUserId: beforeMemberId,
        body: updateBody,
      },
    );
  typia.assert(updatedMember);

  // 7. Validate immutable and mutable fields
  TestValidator.equals(
    "updated member id should remain unchanged",
    updatedMember.id,
    beforeMemberId,
  );
  TestValidator.equals(
    "updated member username should remain unchanged",
    updatedMember.username,
    beforeUsername,
  );
  TestValidator.equals(
    "updated member email should remain unchanged",
    updatedMember.email,
    beforeEmail,
  );
  TestValidator.equals(
    "updated member statusCode should remain unchanged",
    updatedMember.statusCode,
    beforeStatusCode,
  );
  TestValidator.equals(
    "updated member createdAt should remain unchanged",
    updatedMember.createdAt,
    beforeCreatedAt,
  );

  TestValidator.predicate(
    "updatedAt should be refreshed after profile update",
    updatedMember.updatedAt !== beforeUpdatedAt,
  );

  // New profile fields
  TestValidator.equals(
    "displayName should be updated",
    updatedMember.displayName,
    newDisplayName,
  );
  TestValidator.equals("bio should be updated", updatedMember.bio, newBio);
  TestValidator.equals(
    "avatarUrl should be updated",
    updatedMember.avatarUrl,
    newAvatarUrl,
  );

  // Account status object should remain logically the same (id and key/code)
  TestValidator.equals(
    "accountStatus should still allow login",
    updatedMember.accountStatus.isLoginAllowed,
    true,
  );
}
