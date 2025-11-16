import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountStatus";
import type { ICommunityPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityModerator";
import type { ICommunityPlatformPlatformadmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPlatformadmin";

/**
 * Verify that platform-admin-driven partial updates on community moderators
 * only mutate explicitly provided fields while preserving all unspecified
 * fields and lifecycle invariants.
 *
 * Business context:
 *
 * - Platform administrators manage community moderator accounts and their
 *   statuses via dedicated administration APIs.
 * - The update endpoint PUT
 *   /communityPlatform/platformAdmin/communityModerators/{communityModeratorId}
 *   accepts a fully optional ICommunityPlatformCommunityModerator.IUpdate
 *   payload, meaning it should behave as a partial update (patch-like)
 *   operation even though it uses PUT.
 * - The response is an ICommunityPlatformCommunityModerator.ISummary which
 *   includes identity, contact information, account status summary, avatar
 *   information, lifecycle timestamps, and logical deletion flag.
 *
 * This test validates that:
 *
 * 1. Providing an empty IUpdate body effectively returns a stable snapshot of the
 *    moderator without changing any fields.
 * 2. Providing only display_name in the update body changes display_name and
 *    updated_at, while preserving username, email, account_status.id,
 *    avatar_url, is_deleted, and created_at.
 * 3. Providing only email in a subsequent update changes email and updated_at,
 *    while preserving username, display_name, account_status.id, avatar_url,
 *    is_deleted, and created_at.
 * 4. Providing only account_status_id in a later update changes the linked
 *    account_status.id and updated_at, while preserving username, email,
 *    display_name, avatar_url, is_deleted, and created_at.
 *
 * High-level workflow:
 *
 * 1. Register a platform administrator (platformAdmin actor) using the auth join
 *    endpoint; SDK automatically attaches the admin token to the connection.
 * 2. As the platform admin, create an initial account status via POST
 *    /communityPlatform/platformAdmin/accountStatuses to exercise the
 *    master-data dependency (even though the initial moderator status may be
 *    determined by the backend).
 * 3. Register a community moderator via /auth/communityModerator/join and capture
 *    its id from the IAuthorized response.
 * 4. Call the update endpoint with an empty IUpdate body to obtain a baseline
 *    ISummary snapshot for this moderator.
 * 5. Scenario A: issue an update that only sets display_name, then assert that
 *    only display_name and updated_at changed while all other identity and
 *    lifecycle fields remain equal to the baseline.
 * 6. Scenario B: issue an update that only sets email, then assert that only email
 *    and updated_at changed relative to the previous snapshot, with all other
 *    fields preserved.
 * 7. Scenario C: create a second account status, then issue an update that only
 *    sets account_status_id to the new status id and assert that only the
 *    account_status.id and updated_at changed, preserving all other fields.
 */
export async function test_api_community_moderator_partial_update_preserves_unspecified_fields(
  connection: api.IConnection,
) {
  // 1. Register and implicitly login as platform admin (platformAdmin actor)
  const platformAdminJoinBody = {
    username: RandomGenerator.name(1),
    email: `${RandomGenerator.alphabets(8)}@admin.example.com`,
    password: RandomGenerator.alphaNumeric(12),
    displayName: RandomGenerator.name(2),
    ip: "127.0.0.1",
    href: "https://admin.console.example.com/register",
    referrer: "https://admin.console.example.com/",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const platformAdminAuthorized = await api.functional.auth.platformAdmin.join(
    connection,
    {
      body: platformAdminJoinBody,
    },
  );
  typia.assert(platformAdminAuthorized);

  // 2. Create first account status (active-like) for later reference
  const activeStatusBody = {
    key: `ACTIVE_${RandomGenerator.alphabets(6)}`,
    label: "Active moderator",
    description: "Default active status for community moderators",
    isLoginAllowed: true,
    isPostingAllowed: true,
    isVotingAllowed: true,
    requiresManualReview: false,
  } satisfies ICommunityPlatformAccountStatus.ICreate;

  const activeStatus =
    await api.functional.communityPlatform.platformAdmin.accountStatuses.create(
      connection,
      { body: activeStatusBody },
    );
  typia.assert(activeStatus);

  // 3. Register a community moderator; we only get id + token from this response
  const moderatorJoinBody = {
    username: RandomGenerator.name(1),
    email: `${RandomGenerator.alphabets(8)}@moderator.example.com`,
    password: RandomGenerator.alphaNumeric(12),
    display_name: RandomGenerator.name(2),
    ip: "127.0.0.1",
    href: "https://community.example.com/mod/join",
    referrer: "https://community.example.com/",
  } satisfies ICommunityPlatformCommunityModerator.IJoin;

  const moderatorAuthorized = await api.functional.auth.communityModerator.join(
    connection,
    {
      body: moderatorJoinBody,
    },
  );
  typia.assert(moderatorAuthorized);

  const communityModeratorId = moderatorAuthorized.id;

  // 4. Baseline summary via no-op update (empty IUpdate body)
  const baselineSummary =
    await api.functional.communityPlatform.platformAdmin.communityModerators.update(
      connection,
      {
        communityModeratorId,
        body: {},
      },
    );
  typia.assert(baselineSummary);

  // Scenario A: update only display_name
  const newDisplayName = RandomGenerator.name(2);
  const afterDisplayNameUpdate =
    await api.functional.communityPlatform.platformAdmin.communityModerators.update(
      connection,
      {
        communityModeratorId,
        body: {
          display_name: newDisplayName,
        },
      },
    );
  typia.assert(afterDisplayNameUpdate);

  TestValidator.equals(
    "display_name should change when only display_name is provided",
    afterDisplayNameUpdate.display_name ?? null,
    newDisplayName,
  );
  TestValidator.equals(
    "username must be preserved after display_name-only update",
    afterDisplayNameUpdate.username,
    baselineSummary.username,
  );
  TestValidator.equals(
    "email must be preserved after display_name-only update",
    afterDisplayNameUpdate.email,
    baselineSummary.email,
  );
  TestValidator.equals(
    "account_status.id must be preserved after display_name-only update",
    afterDisplayNameUpdate.account_status.id,
    baselineSummary.account_status.id,
  );
  TestValidator.equals(
    "avatar_url must be preserved after display_name-only update",
    afterDisplayNameUpdate.avatar_url ?? null,
    baselineSummary.avatar_url ?? null,
  );
  TestValidator.equals(
    "is_deleted must be preserved after display_name-only update",
    afterDisplayNameUpdate.is_deleted,
    baselineSummary.is_deleted,
  );
  TestValidator.equals(
    "created_at must be stable across display_name-only update",
    afterDisplayNameUpdate.created_at,
    baselineSummary.created_at,
  );
  TestValidator.notEquals(
    "updated_at must change after display_name-only update",
    afterDisplayNameUpdate.updated_at,
    baselineSummary.updated_at,
  );

  // Scenario B: update only email
  const newEmail = `${RandomGenerator.alphabets(8)}@moderator-updated.example.com`;
  const afterEmailUpdate =
    await api.functional.communityPlatform.platformAdmin.communityModerators.update(
      connection,
      {
        communityModeratorId,
        body: {
          email: newEmail,
        },
      },
    );
  typia.assert(afterEmailUpdate);

  TestValidator.equals(
    "email should change when only email is provided",
    afterEmailUpdate.email,
    newEmail,
  );
  TestValidator.equals(
    "username must be preserved after email-only update",
    afterEmailUpdate.username,
    afterDisplayNameUpdate.username,
  );
  TestValidator.equals(
    "display_name must be preserved after email-only update",
    afterEmailUpdate.display_name ?? null,
    afterDisplayNameUpdate.display_name ?? null,
  );
  TestValidator.equals(
    "account_status.id must be preserved after email-only update",
    afterEmailUpdate.account_status.id,
    afterDisplayNameUpdate.account_status.id,
  );
  TestValidator.equals(
    "avatar_url must be preserved after email-only update",
    afterEmailUpdate.avatar_url ?? null,
    afterDisplayNameUpdate.avatar_url ?? null,
  );
  TestValidator.equals(
    "is_deleted must be preserved after email-only update",
    afterEmailUpdate.is_deleted,
    afterDisplayNameUpdate.is_deleted,
  );
  TestValidator.equals(
    "created_at must be stable across email-only update",
    afterEmailUpdate.created_at,
    afterDisplayNameUpdate.created_at,
  );
  TestValidator.notEquals(
    "updated_at must change after email-only update",
    afterEmailUpdate.updated_at,
    afterDisplayNameUpdate.updated_at,
  );

  // Scenario C: update only account_status_id
  const restrictedStatusBody = {
    key: `SUSPENDED_${RandomGenerator.alphabets(6)}`,
    label: "Suspended moderator",
    description: "Suspended status where moderator cannot log in or interact",
    isLoginAllowed: false,
    isPostingAllowed: false,
    isVotingAllowed: false,
    requiresManualReview: true,
  } satisfies ICommunityPlatformAccountStatus.ICreate;

  const restrictedStatus =
    await api.functional.communityPlatform.platformAdmin.accountStatuses.create(
      connection,
      { body: restrictedStatusBody },
    );
  typia.assert(restrictedStatus);

  const afterStatusUpdate =
    await api.functional.communityPlatform.platformAdmin.communityModerators.update(
      connection,
      {
        communityModeratorId,
        body: {
          account_status_id: restrictedStatus.id,
        },
      },
    );
  typia.assert(afterStatusUpdate);

  TestValidator.equals(
    "account_status.id should change when only account_status_id is provided",
    afterStatusUpdate.account_status.id,
    restrictedStatus.id,
  );
  TestValidator.equals(
    "username must be preserved after account_status-only update",
    afterStatusUpdate.username,
    afterEmailUpdate.username,
  );
  TestValidator.equals(
    "email must be preserved after account_status-only update",
    afterStatusUpdate.email,
    afterEmailUpdate.email,
  );
  TestValidator.equals(
    "display_name must be preserved after account_status-only update",
    afterStatusUpdate.display_name ?? null,
    afterEmailUpdate.display_name ?? null,
  );
  TestValidator.equals(
    "avatar_url must be preserved after account_status-only update",
    afterStatusUpdate.avatar_url ?? null,
    afterEmailUpdate.avatar_url ?? null,
  );
  TestValidator.equals(
    "is_deleted must be preserved after account_status-only update",
    afterStatusUpdate.is_deleted,
    afterEmailUpdate.is_deleted,
  );
  TestValidator.equals(
    "created_at must be stable across account_status-only update",
    afterStatusUpdate.created_at,
    afterEmailUpdate.created_at,
  );
  TestValidator.notEquals(
    "updated_at must change after account_status-only update",
    afterStatusUpdate.updated_at,
    afterEmailUpdate.updated_at,
  );
}
