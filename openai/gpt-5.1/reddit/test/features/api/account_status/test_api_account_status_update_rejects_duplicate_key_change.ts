import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountStatus";
import type { ICommunityPlatformPlatformadmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPlatformadmin";

/**
 * Validate that updating an account status to a duplicate `key` is rejected.
 *
 * Business goal:
 *
 * - Ensure the `key` field on community platform account statuses remains
 *   globally unique, not only at creation time but also during updates.
 * - Prevent administrators from accidentally renaming an existing status to a key
 *   that is already in use by another status, which would introduce ambiguity
 *   for downstream logic that relies on stable unique keys.
 *
 * Scenario:
 *
 * 1. Join as a platform administrator using POST /auth/platformAdmin/join.
 * 2. Create Status A with `key` = "WARNED_TEMPORARY" via POST
 *    /communityPlatform/platformAdmin/accountStatuses.
 * 3. Create Status B with `key` = "SUSPENDED_HARD" via the same create endpoint.
 * 4. Attempt to update Status B using PUT
 *    /communityPlatform/platformAdmin/accountStatuses/{accountStatusId} such
 *    that its `key` becomes "WARNED_TEMPORARY" (matching Status A).
 * 5. Assert that the update call fails with a client-side business error, proving
 *    that the unique-key constraint is enforced on updates.
 */
export async function test_api_account_status_update_rejects_duplicate_key_change(
  connection: api.IConnection,
) {
  // 1. Join as platform administrator to obtain an authenticated admin session.
  const joinBody = {
    username: RandomGenerator.alphabets(12),
    email: `${RandomGenerator.alphabets(8)}@example.com`,
    password: RandomGenerator.alphabets(16),
    displayName: RandomGenerator.name(),
    href: "https://admin-console.example.com/register",
    referrer: "https://admin-console.example.com/landing",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const admin: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: joinBody,
    });
  typia.assert(admin);

  // 2. Create Status A with key "WARNED_TEMPORARY".
  const statusARequest = {
    key: "WARNED_TEMPORARY",
    label: "Warned (Temporary)",
    description: RandomGenerator.paragraph({ sentences: 4 }),
    isLoginAllowed: true,
    isPostingAllowed: false,
    isVotingAllowed: true,
    requiresManualReview: true,
  } satisfies ICommunityPlatformAccountStatus.ICreate;

  const statusA: ICommunityPlatformAccountStatus =
    await api.functional.communityPlatform.platformAdmin.accountStatuses.create(
      connection,
      { body: statusARequest },
    );
  typia.assert(statusA);
  TestValidator.equals(
    "status A key should be WARNED_TEMPORARY",
    statusA.key,
    "WARNED_TEMPORARY",
  );

  // 3. Create Status B with key "SUSPENDED_HARD".
  const statusBRequest = {
    key: "SUSPENDED_HARD",
    label: "Suspended (Hard)",
    description: RandomGenerator.paragraph({ sentences: 4 }),
    isLoginAllowed: false,
    isPostingAllowed: false,
    isVotingAllowed: false,
    requiresManualReview: true,
  } satisfies ICommunityPlatformAccountStatus.ICreate;

  const statusB: ICommunityPlatformAccountStatus =
    await api.functional.communityPlatform.platformAdmin.accountStatuses.create(
      connection,
      { body: statusBRequest },
    );
  typia.assert(statusB);
  TestValidator.equals(
    "status B key should be SUSPENDED_HARD",
    statusB.key,
    "SUSPENDED_HARD",
  );

  // 4. Attempt to update Status B so its key duplicates Status A's key.
  const duplicateKeyUpdate = {
    key: "WARNED_TEMPORARY",
  } satisfies ICommunityPlatformAccountStatus.IUpdate;

  await TestValidator.error(
    "updating status B key to an existing key should fail",
    async () => {
      await api.functional.communityPlatform.platformAdmin.accountStatuses.update(
        connection,
        {
          accountStatusId: statusB.id,
          body: duplicateKeyUpdate,
        },
      );
    },
  );
}
