import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountStatus";
import type { ICommunityPlatformPlatformadmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPlatformadmin";

/**
 * Validate that platform-admin-triggered guest user deletion fails when
 * business rules prevent erasure.
 *
 * This test models the scenario where certain guest user records cannot be
 * deleted because they are constrained by compliance, active investigations, or
 * unresolved security events. The concrete linkage to those records is
 * abstracted (no guest-user creation/read APIs are exposed here), so the test
 * focuses on the observable behavior: the DELETE call fails instead of
 * succeeding.
 *
 * Business-flow approximation with available APIs:
 *
 * 1. Register a platform administrator via POST /auth/platformAdmin/join using
 *    ICommunityPlatformPlatformadmin.IJoin. This yields an
 *    ICommunityPlatformPlatformadmin.IAuthorized response, and the SDK
 *    automatically sets the Authorization header on the connection for
 *    subsequent calls.
 * 2. As the platform admin, create a new account status via POST
 *    /communityPlatform/platformAdmin/accountStatuses with a valid
 *    ICommunityPlatformAccountStatus.ICreate payload to simulate that account
 *    status master data exists. This mirrors a realistic admin setup step and
 *    exercises that dependency endpoint.
 * 3. Using the authenticated admin connection, attempt to erase a guest user via
 *    DELETE /communityPlatform/platformAdmin/guestUsers/{guestUserId} by
 *    calling api.functional.communityPlatform.platformAdmin.guestUsers.erase
 *    with a syntactically valid (UUID-like) guestUserId.
 * 4. Assert, using TestValidator.error, that the erase call fails with an error,
 *    representing business-rule prevention of deletion. We do not inspect
 *    status codes or error payloads, only that an error occurs.
 *
 * Because no guest-user create/read API is exposed in the SDK, we cannot
 * explicitly set up a concrete guest user record or re-read it after the failed
 * deletion attempt. Therefore, the test limits its scope to verifying that the
 * deletion attempt, made under a fully authenticated platform-admin context
 * with realistic configuration in place, does not succeed and instead results
 * in an error.
 */
export async function test_api_platform_admin_prevents_deletion_when_restricted_by_business_rules(
  connection: api.IConnection,
) {
  // 1. Register a platform administrator and obtain an authorized context.
  //    The join() function also configures the Authorization header on the
  //    provided connection instance automatically.
  const joinBody = {
    username: RandomGenerator.alphabets(12),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    displayName: RandomGenerator.name(),
    ip: undefined,
    href: "https://admin.community.example/join",
    referrer: "https://community.example/landing",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const platformAdmin: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: joinBody,
    });
  typia.assert(platformAdmin);

  // 2. Create at least one account status as a realistic admin-side
  //    configuration step. This ensures that the account status catalog is
  //    exercised in the same admin session.
  const statusBody = {
    key: `GUEST_RESTRICTED_${RandomGenerator.alphaNumeric(8)}`,
    label: "Guest Deletion Restricted",
    description:
      "Represents guest users that cannot be deleted due to compliance or security holds.",
    isLoginAllowed: false,
    isPostingAllowed: false,
    isVotingAllowed: false,
    requiresManualReview: true,
  } satisfies ICommunityPlatformAccountStatus.ICreate;

  const accountStatus: ICommunityPlatformAccountStatus =
    await api.functional.communityPlatform.platformAdmin.accountStatuses.create(
      connection,
      { body: statusBody },
    );
  typia.assert(accountStatus);

  // Sanity-check that the status we created is marked as requiring manual
  // review, which fits our scenario narrative that special handling is needed
  // for restricted accounts.
  TestValidator.predicate(
    "created account status should require manual review",
    accountStatus.requiresManualReview === true,
  );

  // 3. Attempt to delete a guest user that is conceptually under restriction.
  //    We do not have a concrete creation API for guest users, so we generate
  //    a UUID-like identifier to represent a guestUserId that the backend may
  //    treat as non-deletable due to linked records or policy constraints.
  const restrictedGuestUserId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  // 4. Assert that attempting to erase this guest user fails. We use
  //    TestValidator.error with an async closure and `await` it, as required.
  await TestValidator.error(
    "platform admin cannot erase a restricted guest user",
    async () => {
      await api.functional.communityPlatform.platformAdmin.guestUsers.erase(
        connection,
        { guestUserId: restrictedGuestUserId },
      );
    },
  );
}
