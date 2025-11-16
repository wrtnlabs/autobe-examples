import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountStatus";
import type { ICommunityPlatformPlatformadmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPlatformadmin";

/**
 * Validate that one platform administrator can retrieve another administrator's
 * profile through the platform admin detail endpoint.
 *
 * Business flow covered:
 *
 * 1. Create a reusable "active" account status definition so that platform admins
 *    operate under a valid status catalog.
 * 2. Register the first platform admin (Admin A) via POST
 *    /auth/platformAdmin/join.
 * 3. Register the second platform admin (Admin B) via the same join endpoint and
 *    capture their authorized profile information.
 * 4. Using the authenticated platform-admin context on the shared connection, call
 *    GET /communityPlatform/platformAdmin/platformAdmins/{platformAdminId}
 *    targeting Admin B's id.
 * 5. Assert that the returned ICommunityPlatformPlatformadmin:
 *
 *    - Has the same id, username, and email as Admin B's authorized payload.
 *    - Has a displayName matching Admin B's displayName.
 *    - Embeds an accountStatus summary equal to Admin B's accountStatus.
 *    - Shares identical createdAt and updatedAt timestamps with Admin B.
 *    - Has deletedAt null/undefined, consistent with a freshly joined admin.
 *
 * This test focuses on the happy path for an active (non-deleted) platform
 * admin. Soft-deleted variants are not exercised because no delete/deactivate
 * API is available in the provided materials.
 */
export async function test_api_platform_admin_get_other_admin_profile(
  connection: api.IConnection,
) {
  // 1. Create an "active" account status definition to ensure status catalog
  const statusKey = "ACTIVE";
  const statusLabel = "Active";

  const createdStatus =
    await api.functional.communityPlatform.platformAdmin.accountStatuses.create(
      connection,
      {
        body: {
          key: statusKey,
          label: statusLabel,
          description: RandomGenerator.paragraph({ sentences: 3 }),
          isLoginAllowed: true,
          isPostingAllowed: true,
          isVotingAllowed: true,
          requiresManualReview: false,
        } satisfies ICommunityPlatformAccountStatus.ICreate,
      },
    );
  typia.assert<ICommunityPlatformAccountStatus>(createdStatus);

  // 2. Register Admin A (caller) via platformAdmin.join
  const adminAJoinInput = {
    username: RandomGenerator.alphabets(12),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    displayName: RandomGenerator.name(),
    href: "https://admin.console.local/join/platform-admin",
    referrer: "https://admin.console.local/login",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const adminA = await api.functional.auth.platformAdmin.join(connection, {
    body: adminAJoinInput,
  });
  typia.assert<ICommunityPlatformPlatformadmin.IAuthorized>(adminA);

  // 3. Register Admin B (target) via platformAdmin.join
  const adminBJoinInput = {
    username: RandomGenerator.alphabets(12),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    displayName: RandomGenerator.name(),
    href: "https://admin.console.local/join/platform-admin",
    referrer: "https://admin.console.local/login",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const adminB = await api.functional.auth.platformAdmin.join(connection, {
    body: adminBJoinInput,
  });
  typia.assert<ICommunityPlatformPlatformadmin.IAuthorized>(adminB);

  // 4. Fetch Admin B's profile through the platformAdmins.at detail endpoint
  const fetched =
    await api.functional.communityPlatform.platformAdmin.platformAdmins.at(
      connection,
      {
        platformAdminId: adminB.id,
      },
    );
  typia.assert<ICommunityPlatformPlatformadmin>(fetched);

  // 5. Business assertions
  // 5-1. Basic identifiers must match Admin B's authorized payload
  TestValidator.equals(
    "platform admin id should match Admin B",
    fetched.id,
    adminB.id,
  );
  TestValidator.equals(
    "platform admin username should match Admin B",
    fetched.username,
    adminB.username,
  );
  TestValidator.equals(
    "platform admin email should match Admin B",
    fetched.email,
    adminB.email,
  );

  // 5-2. Display name in the read model should equal Admin B's displayName
  TestValidator.equals(
    "platform admin displayName should match Admin B",
    fetched.displayName,
    adminB.displayName,
  );

  // 5-3. Account status summary consistency between authorized and read profile
  TestValidator.equals(
    "account status summary should match between authorized and read profile",
    fetched.accountStatus,
    adminB.accountStatus,
  );

  // 5-4. Lifecycle timestamps must match
  TestValidator.equals(
    "createdAt should match between authorized and read profile",
    fetched.createdAt,
    adminB.createdAt,
  );
  TestValidator.equals(
    "updatedAt should match between authorized and read profile",
    fetched.updatedAt,
    adminB.updatedAt,
  );

  // 5-5. Soft delete field should be null/undefined for a newly joined admin
  TestValidator.equals(
    "deletedAt should be null or undefined for newly joined admin (read profile)",
    fetched.deletedAt ?? null,
    null,
  );
  TestValidator.equals(
    "deletedAt should be null or undefined for newly joined admin (authorized profile)",
    adminB.deletedAt ?? null,
    null,
  );
}
