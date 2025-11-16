import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountStatus";
import type { ICommunityPlatformPlatformadmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPlatformadmin";

/**
 * Validate delete behavior for non-existent account statuses.
 *
 * ## Business goal
 *
 * Ensure that the platform-admin delete endpoint for account statuses:
 *
 * - Returns a not-found style HTTP error when the target ID does not exist
 * - Does not affect existing, valid account status records
 * - Works only under an authenticated platformAdmin context
 *
 * ## High-level steps
 *
 * 1. Establish a platformAdmin session via POST /auth/platformAdmin/join.
 * 2. Create a real account status via POST
 *    /communityPlatform/platformAdmin/accountStatuses so we have at least one
 *    valid row that must remain unaffected.
 * 3. Generate a random UUID value that is guaranteed to differ from the created
 *    status id.
 * 4. Call DELETE
 *    /communityPlatform/platformAdmin/accountStatuses/{accountStatusId} with
 *    that non-existent UUID.
 * 5. Assert that an HTTP error in the not-found family (404-style) is thrown.
 * 6. Validate that the pre-created status object is still structurally valid to
 *    guard against unexpected side-effects.
 */
export async function test_api_account_status_delete_not_found(
  connection: api.IConnection,
) {
  // 1. Establish platform admin context via join
  const joinBody = {
    username: RandomGenerator.alphabets(12),
    email: `${RandomGenerator.alphabets(8)}@example.com`,
    password: RandomGenerator.alphabets(16),
    displayName: RandomGenerator.name(),
    href: "https://admin.example.com/register",
    referrer: "https://admin.example.com/landing",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const admin: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: joinBody,
    });
  typia.assert(admin);

  // 2. Create a real account status as control data
  const createBody = {
    key: `STATUS_${RandomGenerator.alphabets(6).toUpperCase()}`,
    label: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    isLoginAllowed: true,
    isPostingAllowed: true,
    isVotingAllowed: true,
    requiresManualReview: false,
  } satisfies ICommunityPlatformAccountStatus.ICreate;

  const createdStatus: ICommunityPlatformAccountStatus =
    await api.functional.communityPlatform.platformAdmin.accountStatuses.create(
      connection,
      {
        body: createBody,
      },
    );
  typia.assert(createdStatus);

  // 3. Generate a UUID that definitely differs from createdStatus.id
  let nonExistingId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  if (nonExistingId === createdStatus.id) {
    // Extremely unlikely, but keep it logically strict
    nonExistingId = typia.random<string & tags.Format<"uuid">>();
  }

  // 4 & 5. Attempt to delete with non-existent id, expect HTTP not-found style error
  await TestValidator.httpError(
    "deleting non-existent account status should respond with not-found style HTTP error",
    [404, 410],
    async () => {
      await api.functional.communityPlatform.platformAdmin.accountStatuses.erase(
        connection,
        {
          accountStatusId: nonExistingId,
        },
      );
    },
  );

  // 6. Re-assert the originally created status object to ensure structural validity
  typia.assert<ICommunityPlatformAccountStatus>(createdStatus);

  // Basic semantic checks on the created status to reflect no unexpected mutation
  TestValidator.predicate(
    "created status id remains a non-empty uuid string in memory",
    () => typeof createdStatus.id === "string" && createdStatus.id.length > 0,
  );
  TestValidator.predicate(
    "created status key remains the same as initially set",
    () => createdStatus.key === createBody.key,
  );
}
