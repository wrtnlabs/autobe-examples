import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountStatus";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";
import type { ICommunityPlatformPlatformadmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPlatformadmin";

/**
 * Verify that member profile updates work end-to-end and are wired through
 * authenticated memberUser flows, while a platformAdmin can define restrictive
 * account statuses via the master table.
 *
 * Business context:
 *
 * - Platform admins manage account status definitions in
 *   community_platform_account_statuses using POST
 *   /communityPlatform/platformAdmin/accountStatuses.
 * - Member users authenticate via /auth/memberUser/join and later update their
 *   public profile via PUT
 *   /communityPlatform/memberUser/memberUsers/{memberUserId}.
 * - The original scenario wanted to assert that a restrictive status blocks
 *   profile updates, but no API exists in the provided surface to assign that
 *   status to the member. Therefore this test validates the happy-path profile
 *   update and the integrity of status creation instead.
 *
 * Steps:
 *
 * 1. Platform admin joins (registers and becomes authenticated).
 * 2. Platform admin creates a restrictive account status definition.
 * 3. Member user joins and becomes authenticated.
 * 4. Member user calls the profile update endpoint with new displayName and bio.
 * 5. Validate the updated member entity and ensure the profile fields changed and
 *    the id remains stable.
 */
export async function test_api_member_user_profile_update_respects_account_status_restrictions(
  connection: api.IConnection,
) {
  // 1. Platform admin joins
  const platformAdminJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    displayName: RandomGenerator.name(),
    ip: RandomGenerator.alphaNumeric(8),
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const platformAdminAuthorized: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinBody,
    });
  typia.assert(platformAdminAuthorized);

  // 2. Platform admin creates a restrictive account status definition
  const restrictiveStatusBody = {
    key: `RESTRICTED_${RandomGenerator.alphaNumeric(8)}`,
    label: "Restricted profile modifications",
    description: RandomGenerator.paragraph({ sentences: 5 }),
    isLoginAllowed: true,
    isPostingAllowed: false,
    isVotingAllowed: false,
    requiresManualReview: true,
  } satisfies ICommunityPlatformAccountStatus.ICreate;

  const restrictiveStatus: ICommunityPlatformAccountStatus =
    await api.functional.communityPlatform.platformAdmin.accountStatuses.create(
      connection,
      {
        body: restrictiveStatusBody,
      },
    );
  typia.assert(restrictiveStatus);

  TestValidator.equals(
    "created account status key should match request",
    restrictiveStatus.key,
    restrictiveStatusBody.key,
  );
  TestValidator.equals(
    "created account status label should match request",
    restrictiveStatus.label,
    restrictiveStatusBody.label,
  );
  TestValidator.equals(
    "created account status login flag should match request",
    restrictiveStatus.isLoginAllowed,
    restrictiveStatusBody.isLoginAllowed,
  );
  TestValidator.equals(
    "created account status posting flag should match request",
    restrictiveStatus.isPostingAllowed,
    restrictiveStatusBody.isPostingAllowed,
  );
  TestValidator.equals(
    "created account status voting flag should match request",
    restrictiveStatus.isVotingAllowed,
    restrictiveStatusBody.isVotingAllowed,
  );
  TestValidator.equals(
    "created account status manual review flag should match request",
    restrictiveStatus.requiresManualReview,
    restrictiveStatusBody.requiresManualReview,
  );

  // 3. Member user joins
  const memberJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    ip: RandomGenerator.alphaNumeric(8),
    href: "https://community.example.com/join",
    referrer: "https://community.example.com/home",
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  const memberAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorized);

  const memberUserId = memberAuthorized.id;

  // 4. Member user updates their profile using the memberUsers.update endpoint
  const newDisplayName = RandomGenerator.name();
  const newBio = RandomGenerator.paragraph({ sentences: 6 });

  const updateBody = {
    displayName: newDisplayName,
    bio: newBio,
  } satisfies ICommunityPlatformMemberuser.IUpdate;

  const updatedMember: ICommunityPlatformMemberuser =
    await api.functional.communityPlatform.memberUser.memberUsers.update(
      connection,
      {
        memberUserId,
        body: updateBody,
      },
    );
  typia.assert(updatedMember);

  // 5. Validate updated member entity
  TestValidator.equals(
    "updated member id should equal authorized member id",
    updatedMember.id,
    memberUserId,
  );
  TestValidator.equals(
    "updated member displayName should reflect update payload",
    updatedMember.displayName,
    newDisplayName,
  );
  TestValidator.equals(
    "updated member bio should reflect update payload",
    updatedMember.bio,
    newBio,
  );

  // Ensure accountStatus summary is present and structurally valid
  typia.assert(updatedMember.accountStatus);
}
