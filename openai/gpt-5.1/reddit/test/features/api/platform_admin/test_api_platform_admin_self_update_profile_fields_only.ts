import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountStatus";
import type { ICommunityPlatformPlatformadmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPlatformadmin";

/**
 * Validate that a platform administrator can self-update only mutable profile
 * fields (username, email, displayName) using the platformAdmins.update
 * endpoint, while account status and lifecycle timestamps behave correctly.
 *
 * Business goals:
 *
 * - Confirm that calling PUT
 *   /communityPlatform/platformAdmin/platformAdmins/{platformAdminId} with an
 *   ICommunityPlatformPlatformadmin.IUpdate body that omits accountStatusId
 *   updates only the mutable identity fields and does not change the admin's
 *   account status.
 * - Confirm createdAt remains stable, updatedAt moves forward, and deletedAt
 *   remains null/undefined for an active admin.
 * - Ensure that the SDK-level join flow properly authenticates the connection and
 *   that the update call can be performed by the same admin (self-update).
 *
 * High-level steps:
 *
 * 1. Register platform admin A via auth.platformAdmin.join, capturing:
 *
 *    - Id, username, email, displayName, accountStatus, createdAt, updatedAt,
 *         deletedAt.
 * 2. Optionally create one additional account status via
 *    communityPlatform.platformAdmin.accountStatuses.create to simulate
 *    realistic status catalog presence (without linking it to A).
 * 3. Build an ICommunityPlatformPlatformadmin.IUpdate payload that:
 *
 *    - Sets a new username (different from baseline username),
 *    - Sets a new email (different from baseline email),
 *    - Sets displayName to a new non-null string,
 *    - Omits accountStatusId so that accountStatus remains unchanged.
 * 4. Call communityPlatform.platformAdmin.platformAdmins.update with A.id and the
 *    update payload.
 * 5. Validate the returned ICommunityPlatformPlatformadmin:
 *
 *    - Id is unchanged and equals A.id.
 *    - Username/email/displayName match the values in the update payload.
 *    - AccountStatus deeply equals the original accountStatus from join.
 *    - CreatedAt exactly equals original createdAt.
 *    - UpdatedAt is different from original updatedAt and lexicographically greater
 *         (later timestamp).
 *    - DeletedAt remains null or undefined (matches original state).
 * 6. Treat the update response as the persisted state (no extra GET endpoint is
 *    available in the provided SDK list), and perform all assertions against
 *    the initial join snapshot plus the update payload.
 */
export async function test_api_platform_admin_self_update_profile_fields_only(
  connection: api.IConnection,
) {
  // 1. Register platform admin A via join
  const joinBody = {
    username: RandomGenerator.alphabets(12),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    displayName: RandomGenerator.name(),
    href: "https://admin.example.com/register" as string & tags.Format<"uri">,
    referrer: "https://admin.example.com" as string & tags.Format<"uri">,
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const authorized: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: joinBody,
    });
  typia.assert(authorized);

  // Capture baseline snapshot
  const baselineId = authorized.id;
  const baselineUsername = authorized.username;
  const baselineEmail = authorized.email;
  const baselineDisplayName = authorized.displayName;
  const baselineAccountStatus = authorized.accountStatus;
  const baselineCreatedAt = authorized.createdAt;
  const baselineUpdatedAt = authorized.updatedAt;
  const baselineDeletedAt = authorized.deletedAt ?? null;

  // Sanity checks on baseline
  TestValidator.predicate(
    "baseline id is non-empty uuid",
    () => typeof baselineId === "string" && baselineId.length > 0,
  );
  TestValidator.predicate(
    "baseline email differs from username to avoid trivial collisions",
    baselineEmail !== baselineUsername,
  );

  // 2. Optionally create an additional account status for realism
  const statusBody = {
    key: `ACTIVE_${RandomGenerator.alphabets(6)}`,
    label: "Active Admin",
    description: RandomGenerator.paragraph({ sentences: 3 }),
    isLoginAllowed: true,
    isPostingAllowed: true,
    isVotingAllowed: true,
    requiresManualReview: false,
  } satisfies ICommunityPlatformAccountStatus.ICreate;

  const createdStatus: ICommunityPlatformAccountStatus =
    await api.functional.communityPlatform.platformAdmin.accountStatuses.create(
      connection,
      { body: statusBody },
    );
  typia.assert(createdStatus);

  TestValidator.predicate(
    "created account status has a uuid id",
    () => typeof createdStatus.id === "string" && createdStatus.id.length > 0,
  );

  // 3. Prepare update payload for username/email/displayName only
  const newUsername = `${baselineUsername}_${RandomGenerator.alphabets(4)}`;
  const newEmail = typia.random<string & tags.Format<"email">>();
  const newDisplayName = `${baselineDisplayName} (updated)`;

  const updateBody = {
    username: newUsername,
    email: newEmail,
    displayName: newDisplayName,
    // Intentionally omit accountStatusId to keep account status unchanged
  } satisfies ICommunityPlatformPlatformadmin.IUpdate;

  // 4. Call update endpoint for self-update
  const updated: ICommunityPlatformPlatformadmin =
    await api.functional.communityPlatform.platformAdmin.platformAdmins.update(
      connection,
      {
        platformAdminId: baselineId,
        body: updateBody,
      },
    );
  typia.assert(updated);

  // 5. Validate core invariants and field updates
  TestValidator.equals(
    "id should remain unchanged after self-update",
    updated.id,
    baselineId,
  );

  TestValidator.equals(
    "username should match updated username",
    updated.username,
    newUsername,
  );

  TestValidator.equals(
    "email should match updated email",
    updated.email,
    newEmail,
  );

  TestValidator.equals(
    "displayName should match updated displayName",
    updated.displayName,
    newDisplayName,
  );

  // Account status must remain exactly the same
  TestValidator.equals(
    "accountStatus should remain unchanged when accountStatusId is omitted",
    updated.accountStatus,
    baselineAccountStatus,
  );

  // createdAt must be stable
  TestValidator.equals(
    "createdAt should remain unchanged after update",
    updated.createdAt,
    baselineCreatedAt,
  );

  // updatedAt must change and be later (lexicographically greater) than before
  TestValidator.notEquals(
    "updatedAt should change after profile update",
    updated.updatedAt,
    baselineUpdatedAt,
  );

  TestValidator.predicate(
    "updatedAt should be later than baseline updatedAt (lexicographical ISO compare)",
    updated.updatedAt > baselineUpdatedAt,
  );

  // deletedAt should remain null/undefined
  const updatedDeletedAt = updated.deletedAt ?? null;
  TestValidator.equals(
    "deletedAt should remain null/undefined after self-update",
    updatedDeletedAt,
    baselineDeletedAt,
  );
}
