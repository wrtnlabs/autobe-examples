import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountStatus";
import type { ICommunityPlatformPlatformadmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPlatformadmin";

/**
 * Validate that a privileged platform admin can update another admin's account
 * status to a more restrictive definition and that the change is immediately
 * reflected in the admin read DTO's embedded accountStatus summary.
 *
 * Scenario steps:
 *
 * 1. Register platform admin A via POST /auth/platformAdmin/join, which also
 *    establishes an authenticated platformAdmin context on the shared
 *    connection.
 * 2. As A, create two account statuses via POST
 *    /communityPlatform/platformAdmin/accountStatuses:
 *
 *    - ACTIVE (permissive: login/posting/voting allowed).
 *    - SUSPENDED (restrictive: login/posting/voting disallowed and
 *         requiresManualReview=true).
 * 3. Still as A, register platform admin B via /auth/platformAdmin/join and
 *    capture its id and basic profile fields.
 * 4. As A, call PUT
 *    /communityPlatform/platformAdmin/platformAdmins/{platformAdminId} with B's
 *    id and an ICommunityPlatformPlatformadmin.IUpdate payload that only sets
 *    accountStatusId to the SUSPENDED status id, leaving
 *    username/email/displayName unchanged.
 * 5. Assert that the returned ICommunityPlatformPlatformadmin:
 *
 *    - Preserves B's id, username, email, createdAt and deletedAt.
 *    - Exposes an accountStatus summary whose id/key/code/label/ description and
 *         behavioral flags match the SUSPENDED definition created in step 2.
 *
 * This test focuses on update and projection behavior; behavioral effects of
 * the status (e.g., blocking login) are validated in other scenarios.
 */
export async function test_api_platform_admin_update_status_to_restrict_access(
  connection: api.IConnection,
) {
  // 1. Register platform admin A (super admin) to establish auth context.
  const joinBodyA = {
    username: `admin_a_${RandomGenerator.alphaNumeric(8)}`,
    email: `${RandomGenerator.alphaNumeric(8)}@example.com`,
    password: RandomGenerator.alphaNumeric(12),
    displayName: RandomGenerator.name(),
    href: "https://admin.example.com/register",
    referrer: "https://admin.example.com/landing",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const adminA = await api.functional.auth.platformAdmin.join(connection, {
    body: joinBodyA,
  });
  typia.assert<ICommunityPlatformPlatformadmin.IAuthorized>(adminA);

  // 2. Create two account statuses: ACTIVE (permissive) and SUSPENDED (restrictive).
  const activeKey = "ACTIVE";
  const suspendedKey = "SUSPENDED";

  const activeStatusBody = {
    key: activeKey,
    label: "Active",
    description: "Active platform admin with full permissions.",
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
  typia.assert<ICommunityPlatformAccountStatus>(activeStatus);

  const suspendedStatusBody = {
    key: suspendedKey,
    label: "Suspended",
    description: "Suspended admin; login and posting not allowed.",
    isLoginAllowed: false,
    isPostingAllowed: false,
    isVotingAllowed: false,
    requiresManualReview: true,
  } satisfies ICommunityPlatformAccountStatus.ICreate;

  const suspendedStatus =
    await api.functional.communityPlatform.platformAdmin.accountStatuses.create(
      connection,
      { body: suspendedStatusBody },
    );
  typia.assert<ICommunityPlatformAccountStatus>(suspendedStatus);

  // 3. Register platform admin B whose status will be changed.
  const joinBodyB = {
    username: `admin_b_${RandomGenerator.alphaNumeric(8)}`,
    email: `${RandomGenerator.alphaNumeric(8)}@example.com`,
    password: RandomGenerator.alphaNumeric(12),
    displayName: RandomGenerator.name(),
    href: "https://admin.example.com/register",
    referrer: "https://admin.example.com/landing",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const adminB = await api.functional.auth.platformAdmin.join(connection, {
    body: joinBodyB,
  });
  typia.assert<ICommunityPlatformPlatformadmin.IAuthorized>(adminB);

  // 4. As A, update B's accountStatusId to SUSPENDED without changing username/email/displayName.
  const updateBody = {
    accountStatusId: suspendedStatus.id,
  } satisfies ICommunityPlatformPlatformadmin.IUpdate;

  const updatedB =
    await api.functional.communityPlatform.platformAdmin.platformAdmins.update(
      connection,
      {
        platformAdminId: adminB.id,
        body: updateBody,
      },
    );
  typia.assert<ICommunityPlatformPlatformadmin>(updatedB);

  // 5. Assertions on identity fields and updated accountStatus summary.
  TestValidator.equals(
    "platform admin B id should remain unchanged",
    updatedB.id,
    adminB.id,
  );
  TestValidator.equals(
    "platform admin B username should remain unchanged",
    updatedB.username,
    adminB.username,
  );
  TestValidator.equals(
    "platform admin B email should remain unchanged",
    updatedB.email,
    adminB.email,
  );
  TestValidator.equals(
    "platform admin B displayName should remain unchanged",
    updatedB.displayName ?? null,
    adminB.displayName,
  );
  TestValidator.equals(
    "platform admin B deletedAt should remain unchanged",
    updatedB.deletedAt ?? null,
    adminB.deletedAt ?? null,
  );
  TestValidator.equals(
    "platform admin B createdAt should remain unchanged",
    updatedB.createdAt,
    adminB.createdAt,
  );

  // Verify that accountStatus summary now corresponds to the suspended status.
  const summary = updatedB.accountStatus;

  TestValidator.equals(
    "updated accountStatus.id should equal suspendedStatus.id",
    summary.id,
    suspendedStatus.id,
  );
  TestValidator.equals(
    "updated accountStatus.key should equal suspendedStatus.key",
    summary.key,
    suspendedStatus.key,
  );
  TestValidator.equals(
    "updated accountStatus.code should mirror key",
    summary.code,
    suspendedStatus.key,
  );
  TestValidator.equals(
    "updated accountStatus.label should equal suspendedStatus.label",
    summary.label,
    suspendedStatus.label,
  );
  TestValidator.equals(
    "updated accountStatus.description should equal suspendedStatus.description",
    summary.description,
    suspendedStatus.description ?? "",
  );
  TestValidator.equals(
    "updated accountStatus.isLoginAllowed should match suspendedStatus",
    summary.isLoginAllowed,
    suspendedStatus.isLoginAllowed,
  );
  TestValidator.equals(
    "updated accountStatus.isPostingAllowed should match suspendedStatus",
    summary.isPostingAllowed,
    suspendedStatus.isPostingAllowed,
  );
  TestValidator.equals(
    "updated accountStatus.isVotingAllowed should match suspendedStatus",
    summary.isVotingAllowed,
    suspendedStatus.isVotingAllowed,
  );
  TestValidator.equals(
    "updated accountStatus.requiresManualReview should match suspendedStatus",
    summary.requiresManualReview,
    suspendedStatus.requiresManualReview,
  );
}
