import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountStatus";
import type { ICommunityPlatformPlatformadmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPlatformadmin";

/**
 * Validate that creating an account status with a duplicate key is rejected.
 *
 * Business goal: Ensure the master table community_platform_account_statuses
 * enforces a globally unique `key` for account status definitions so that
 * status references across the platform remain unambiguous and safe for
 * security- sensitive workflows.
 *
 * Scenario steps:
 *
 * 1. Join as a platform administrator using the admin join endpoint so that
 *    subsequent requests execute under platformAdmin authorization.
 * 2. Create an account status with a specific `key` using the
 *    communityPlatform/platformAdmin/accountStatuses.create endpoint and
 *    confirm that it succeeds.
 * 3. Attempt to create another account status with the same `key` but potentially
 *    different label/description/flags and verify that this second attempt
 *    fails.
 *
 * Validation rules:
 *
 * - First creation must succeed and return a valid
 *   ICommunityPlatformAccountStatus object.
 * - Second creation with the same `key` must throw an error, which is asserted
 *   using TestValidator.error without inspecting HTTP status codes or error
 *   payloads.
 * - No additional account status with the duplicate key should be created—this is
 *   implicitly validated by the fact that the second call errors.
 */
export async function test_api_account_status_creation_rejects_duplicate_key(
  connection: api.IConnection,
) {
  // 1. Register a platform administrator to obtain an authenticated context.
  const joinBody = {
    username: RandomGenerator.alphabets(12),
    email: `${RandomGenerator.alphabets(8)}@example.com`,
    password: RandomGenerator.alphaNumeric(16),
    displayName: RandomGenerator.name(),
    href: "https://admin.example.com/signup",
    referrer: "https://admin.example.com/",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const admin = await api.functional.auth.platformAdmin.join(connection, {
    body: joinBody,
  });
  typia.assert(admin);

  // 2. Create an initial account status with a concrete key.
  const statusKey = "BANNED_GLOBAL";

  const firstCreateBody = {
    key: statusKey,
    label: "Globally Banned",
    description: RandomGenerator.paragraph({ sentences: 5 }),
    isLoginAllowed: false,
    isPostingAllowed: false,
    isVotingAllowed: false,
    requiresManualReview: true,
  } satisfies ICommunityPlatformAccountStatus.ICreate;

  const firstStatus =
    await api.functional.communityPlatform.platformAdmin.accountStatuses.create(
      connection,
      {
        body: firstCreateBody,
      },
    );
  typia.assert(firstStatus);

  // Sanity-check that the created status echoes our key and label.
  TestValidator.equals(
    "first created status should have requested key",
    firstStatus.key,
    statusKey,
  );
  TestValidator.equals(
    "first created status should have requested label",
    firstStatus.label,
    firstCreateBody.label,
  );

  // 3. Attempt to create another status with the same key, expecting failure.
  const secondCreateBody = {
    key: statusKey,
    label: "Duplicate Banned Status",
    description: RandomGenerator.paragraph({ sentences: 3 }),
    isLoginAllowed: false,
    isPostingAllowed: false,
    isVotingAllowed: false,
    requiresManualReview: true,
  } satisfies ICommunityPlatformAccountStatus.ICreate;

  await TestValidator.error(
    "duplicate status key should be rejected",
    async () => {
      await api.functional.communityPlatform.platformAdmin.accountStatuses.create(
        connection,
        {
          body: secondCreateBody,
        },
      );
    },
  );
}
