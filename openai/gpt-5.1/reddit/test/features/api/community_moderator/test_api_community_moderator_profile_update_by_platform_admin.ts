import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountStatus";
import type { ICommunityPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityModerator";
import type { ICommunityPlatformPlatformadmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPlatformadmin";

export async function test_api_community_moderator_profile_update_by_platform_admin(
  connection: api.IConnection,
) {
  // 1. Register a new platform admin (also authenticates and sets admin token)
  const platformAdminJoinBody = {
    username: RandomGenerator.alphabets(12),
    email: `${RandomGenerator.alphabets(8)}@admin.example.com`,
    password: RandomGenerator.alphaNumeric(16),
    displayName: RandomGenerator.name(),
    ip: RandomGenerator.mobile(),
    href: "https://admin.console.example.com/register",
    referrer: "https://admin.console.example.com/",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const platformAdminAuthorizedOnJoin =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinBody,
    });
  typia.assert<ICommunityPlatformPlatformadmin.IAuthorized>(
    platformAdminAuthorizedOnJoin,
  );

  // 2. Create an ACTIVE-like account status for moderators
  const statusKey = `ACTIVE_${RandomGenerator.alphabets(6).toUpperCase()}`;
  const accountStatusCreateBody = {
    key: statusKey,
    label: "Active Moderator",
    description:
      "Status that allows moderator login, posting, and voting operations.",
    isLoginAllowed: true,
    isPostingAllowed: true,
    isVotingAllowed: true,
    requiresManualReview: false,
  } satisfies ICommunityPlatformAccountStatus.ICreate;

  const createdStatus: ICommunityPlatformAccountStatus =
    await api.functional.communityPlatform.platformAdmin.accountStatuses.create(
      connection,
      {
        body: accountStatusCreateBody,
      },
    );
  typia.assert<ICommunityPlatformAccountStatus>(createdStatus);

  // 3. Join a community moderator (this overwrites Authorization with moderator token)
  const originalModeratorUsername = RandomGenerator.alphabets(10);
  const originalModeratorEmail = `${RandomGenerator.alphabets(10)}@moderator.example.com`;

  const moderatorJoinBody = {
    username: originalModeratorUsername,
    email: originalModeratorEmail,
    password: RandomGenerator.alphaNumeric(14),
    display_name: RandomGenerator.name(),
    ip: null,
    href: "https://community.example.com/moderator/join",
    referrer: "https://community.example.com/landing",
  } satisfies ICommunityPlatformCommunityModerator.IJoin;

  const moderatorAuthorizedOnJoin: ICommunityPlatformCommunityModerator.IAuthorized =
    await api.functional.auth.communityModerator.join(connection, {
      body: moderatorJoinBody,
    });
  typia.assert<ICommunityPlatformCommunityModerator.IAuthorized>(
    moderatorAuthorizedOnJoin,
  );

  const communityModeratorId = moderatorAuthorizedOnJoin.id;

  // 4. Re-login as the platform admin to regain admin authority
  const platformAdminLoginBody = {
    identifier: platformAdminJoinBody.email,
    password: platformAdminJoinBody.password,
    ip: null,
    href: "https://admin.console.example.com/login",
    referrer: "https://admin.console.example.com/",
  } satisfies ICommunityPlatformPlatformadmin.ILogin;

  const platformAdminAuthorizedOnLogin =
    await api.functional.auth.platformAdmin.login(connection, {
      body: platformAdminLoginBody,
    });
  typia.assert<ICommunityPlatformPlatformadmin.IAuthorized>(
    platformAdminAuthorizedOnLogin,
  );

  // 5. Perform the moderator profile + status update as platform admin
  const newModeratorUsername = RandomGenerator.alphabets(11);
  const newModeratorEmail = `${RandomGenerator.alphabets(9)}@updated.example.com`;
  const newDisplayName = RandomGenerator.name();

  const updateBody = {
    username: newModeratorUsername,
    email: newModeratorEmail,
    display_name: newDisplayName,
    account_status_id: createdStatus.id,
  } satisfies ICommunityPlatformCommunityModerator.IUpdate;

  const updatedSummary: ICommunityPlatformCommunityModerator.ISummary =
    await api.functional.communityPlatform.platformAdmin.communityModerators.update(
      connection,
      {
        communityModeratorId,
        body: updateBody,
      },
    );
  typia.assert<ICommunityPlatformCommunityModerator.ISummary>(updatedSummary);

  // 6. Validate that the moderator has been updated as requested
  // Identity fields
  TestValidator.notEquals(
    "username should be updated from original to new value",
    updatedSummary.username,
    originalModeratorUsername,
  );
  TestValidator.equals(
    "username in summary matches new value",
    updatedSummary.username,
    newModeratorUsername,
  );

  TestValidator.notEquals(
    "email should be updated from original to new value",
    updatedSummary.email,
    originalModeratorEmail,
  );
  TestValidator.equals(
    "email in summary matches new value",
    updatedSummary.email,
    newModeratorEmail,
  );

  TestValidator.equals(
    "display_name in summary matches updated value",
    updatedSummary.display_name ?? null,
    newDisplayName,
  );

  // Account status linkage
  TestValidator.equals(
    "account_status.id matches created account status id",
    updatedSummary.account_status.id,
    createdStatus.id,
  );
  TestValidator.equals(
    "account_status.key mirrors created status key",
    updatedSummary.account_status.key,
    createdStatus.key,
  );
  TestValidator.equals(
    "account_status.label mirrors created status label",
    updatedSummary.account_status.label,
    createdStatus.label,
  );

  // Lifecycle and deletion flags
  TestValidator.equals(
    "is_deleted remains false after profile update",
    updatedSummary.is_deleted,
    false,
  );

  // Validate created_at and updated_at are both date-time strings and updated_at is not earlier
  // than created_at.
  const createdAtMillis = Date.parse(updatedSummary.created_at);
  const updatedAtMillis = Date.parse(updatedSummary.updated_at);

  TestValidator.predicate(
    "created_at should be a valid date-time string",
    !Number.isNaN(createdAtMillis),
  );

  TestValidator.predicate(
    "updated_at should be a valid date-time string",
    !Number.isNaN(updatedAtMillis),
  );

  TestValidator.predicate(
    "updated_at should be greater than or equal to created_at",
    updatedAtMillis >= createdAtMillis,
  );
}
