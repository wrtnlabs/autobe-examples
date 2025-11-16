import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountStatus";
import type { ICommunityPlatformPlatformadmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPlatformadmin";

/**
 * Verify tightening an existing account status configuration.
 *
 * Business context: Platform administrators manage a catalog of account
 * statuses that control capabilities like login, posting, and voting, along
 * with whether transitions require manual review. Over time they need to
 * "harden" an existing status (e.g., disable posting/voting and require manual
 * review) without changing its identity (id/key) so that existing references
 * remain valid.
 *
 * This test covers the happy-path workflow where an initially permissive status
 * is updated to a more restrictive configuration.
 *
 * Steps:
 *
 * 1. Register and authenticate a platform administrator with POST
 *    /auth/platformAdmin/join.
 * 2. Using the admin context, create a permissive account status via POST
 *    /communityPlatform/platformAdmin/accountStatuses with isLoginAllowed =
 *    true, isPostingAllowed = true, isVotingAllowed = true,
 *    requiresManualReview = false.
 * 3. Update that status via PUT
 *    /communityPlatform/platformAdmin/accountStatuses/{accountStatusId} to
 *    tighten behavior:
 *
 *    - IsPostingAllowed -> false
 *    - IsVotingAllowed -> false
 *    - RequiresManualReview -> true
 *    - IsLoginAllowed remains true (omitted from update payload).
 * 4. Assert that id and key are unchanged and that the response DTO reflects the
 *    new, more restrictive behavior flags.
 */
export async function test_api_account_status_update_to_more_restrictive_configuration(
  connection: api.IConnection,
) {
  // 1. Register and authenticate a platform administrator.
  const adminJoinBody = {
    username: `admin_${RandomGenerator.alphaNumeric(8)}`,
    email: `${RandomGenerator.alphaNumeric(8)}@example.com`,
    password: "StrongP@ssw0rd",
    displayName: RandomGenerator.name(),
    href: "https://admin.example.com/register",
    referrer: "https://admin.example.com/landing",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const admin: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(admin);

  // 2. Create an initially permissive account status.
  const statusKey = `TEST_PERMISSIVE_${RandomGenerator.alphaNumeric(6)}`;
  const createBody = {
    key: statusKey,
    label: "Test Permissive Status",
    description: RandomGenerator.paragraph({ sentences: 5 }),
    isLoginAllowed: true,
    isPostingAllowed: true,
    isVotingAllowed: true,
    requiresManualReview: false,
  } satisfies ICommunityPlatformAccountStatus.ICreate;

  const created: ICommunityPlatformAccountStatus =
    await api.functional.communityPlatform.platformAdmin.accountStatuses.create(
      connection,
      {
        body: createBody,
      },
    );
  typia.assert(created);

  // Basic sanity checks on created status.
  TestValidator.equals(
    "created status key should match request",
    created.key,
    statusKey,
  );
  TestValidator.predicate(
    "created status allows login",
    created.isLoginAllowed,
  );
  TestValidator.predicate(
    "created status allows posting",
    created.isPostingAllowed,
  );
  TestValidator.predicate(
    "created status allows voting",
    created.isVotingAllowed,
  );
  TestValidator.predicate(
    "created status does not require manual review",
    created.requiresManualReview === false,
  );

  // 3. Update the status to a more restrictive configuration.
  const updateBody = {
    isPostingAllowed: false,
    isVotingAllowed: false,
    requiresManualReview: true,
  } satisfies ICommunityPlatformAccountStatus.IUpdate;

  const updated: ICommunityPlatformAccountStatus =
    await api.functional.communityPlatform.platformAdmin.accountStatuses.update(
      connection,
      {
        accountStatusId: created.id,
        body: updateBody,
      },
    );
  typia.assert(updated);

  // 4. Validate identity invariants.
  TestValidator.equals(
    "updated status id should remain unchanged",
    updated.id,
    created.id,
  );
  TestValidator.equals(
    "updated status key should remain unchanged",
    updated.key,
    created.key,
  );

  // Validate behavior flags reflect the more restrictive configuration.
  TestValidator.predicate(
    "login should still be allowed after hardening",
    updated.isLoginAllowed === true,
  );
  TestValidator.predicate(
    "posting should be disabled after hardening",
    updated.isPostingAllowed === false,
  );
  TestValidator.predicate(
    "voting should be disabled after hardening",
    updated.isVotingAllowed === false,
  );
  TestValidator.predicate(
    "manual review should be required after hardening",
    updated.requiresManualReview === true,
  );
}
