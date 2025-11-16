import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountStatus";
import type { ICommunityPlatformPlatformadmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPlatformadmin";

/**
 * Validate that GET-by-id for account status reflects the latest updates.
 *
 * Business goal
 *
 * - Ensure that when a platform admin updates an account status definition, a
 *   subsequent GET-by-id call returns the updated state from
 *   community_platform_account_statuses, not stale values.
 *
 * Scenario steps
 *
 * 1. Register a new platform administrator with POST /auth/platformAdmin/join so
 *    that we have an authenticated platformAdmin actor. This also sets the
 *    Authorization header on the shared connection via the SDK.
 * 2. As that admin, create an account status using POST
 *    /communityPlatform/platformAdmin/accountStatuses with a concrete
 *    ICommunityPlatformAccountStatus.ICreate payload.
 * 3. Capture the returned ICommunityPlatformAccountStatus instance as `created`.
 * 4. Prepare an ICommunityPlatformAccountStatus.IUpdate payload that changes
 *    textual fields (label, description) and flips at least one behavior flag
 *    (for example, toggling isPostingAllowed or isVotingAllowed). Do **not**
 *    change the key in this test so that we can assert it remains stable.
 * 5. Call PUT /communityPlatform/platformAdmin/accountStatuses/{accountStatusId}
 *    by passing created.id as accountStatusId and the update payload as body.
 *    Capture the response as `updated`.
 * 6. Immediately call GET
 *    /communityPlatform/platformAdmin/accountStatuses/{accountStatusId} for the
 *    same id and capture the response as `fetched`.
 * 7. Assert the following with TestValidator:
 *
 *    - `fetched.id` equals `created.id` and `updated.id`.
 *    - `fetched.key` equals `created.key` (we deliberately did not update key).
 *    - `fetched.label` equals the new label from the update payload/`updated`.
 *    - `fetched.description` equals the new description from the update
 *         payload/`updated` (taking into account that description is
 *         optional).
 *    - All boolean flags (`isLoginAllowed`, `isPostingAllowed`, `isVotingAllowed`,
 *         `requiresManualReview`) in `fetched` match those in `updated`.
 *    - `fetched.createdAt` equals `created.createdAt`, proving creation timestamp
 *         did not change.
 *    - `fetched.updatedAt` differs from `created.updatedAt` (if present) and is
 *         equal to or comes after `created.createdAt` logically (string
 *         comparison as ISO date-times is acceptable, but we can just assert
 *         inequality vs `created.updatedAt` and equality vs
 *         `updated.updatedAt`).
 * 8. Use `typia.assert` on all API responses to validate shape.
 * 9. Avoid any type-error or HTTP status-code testing; focus purely on state
 *    consistency across create → update → get.
 */
export async function test_api_account_status_get_by_id_reflects_updates(
  connection: api.IConnection,
) {
  // 1. Register and authenticate a platform administrator
  const adminJoinBody = {
    username: RandomGenerator.alphabets(12),
    email: `${RandomGenerator.alphabets(8)}@example.com`,
    password: RandomGenerator.alphabets(16),
    displayName: RandomGenerator.name(),
    href: "https://admin.console.example.com/register", // valid URI
    referrer: "https://admin.console.example.com/", // valid URI
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const admin: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(admin);

  // 2. Create an initial account status definition
  const createBody = {
    key: `TEST_STATUS_${RandomGenerator.alphaNumeric(8)}`,
    label: "Initial Label",
    description: RandomGenerator.paragraph({ sentences: 4 }),
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

  // 3. Prepare an update payload that changes multiple fields (but not key)
  const updatedLabel = "Updated Label";
  const updatedDescription = RandomGenerator.paragraph({ sentences: 6 });
  const updateBody = {
    // key omitted on purpose to keep it stable
    label: updatedLabel,
    description: updatedDescription,
    isLoginAllowed: created.isLoginAllowed,
    isPostingAllowed: !created.isPostingAllowed,
    isVotingAllowed: !created.isVotingAllowed,
    requiresManualReview: !created.requiresManualReview,
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

  // 4. GET the same status by id
  const fetched: ICommunityPlatformAccountStatus =
    await api.functional.communityPlatform.platformAdmin.accountStatuses.at(
      connection,
      {
        accountStatusId: created.id,
      },
    );
  typia.assert(fetched);

  // 5. Assertions on identity and key stability
  TestValidator.equals(
    "id should be stable across create, update, and fetch",
    fetched.id,
    created.id,
  );
  TestValidator.equals(
    "id from update should match fetched id",
    fetched.id,
    updated.id,
  );
  TestValidator.equals(
    "key should remain unchanged because we did not update it",
    fetched.key,
    created.key,
  );

  // 6. Assertions on updated fields
  TestValidator.equals(
    "label should reflect updated value",
    fetched.label,
    updatedLabel,
  );
  TestValidator.equals(
    "description should reflect updated value",
    fetched.description ?? undefined,
    updatedDescription,
  );

  TestValidator.equals(
    "isLoginAllowed should match updated flag",
    fetched.isLoginAllowed,
    updateBody.isLoginAllowed,
  );
  TestValidator.equals(
    "isPostingAllowed should match updated flag",
    fetched.isPostingAllowed,
    updateBody.isPostingAllowed,
  );
  TestValidator.equals(
    "isVotingAllowed should match updated flag",
    fetched.isVotingAllowed,
    updateBody.isVotingAllowed,
  );
  TestValidator.equals(
    "requiresManualReview should match updated flag",
    fetched.requiresManualReview,
    updateBody.requiresManualReview,
  );

  // 7. Timestamps: createdAt must remain stable; updatedAt must change
  TestValidator.equals(
    "createdAt should remain the same between create and fetch",
    fetched.createdAt,
    created.createdAt,
  );

  TestValidator.notEquals(
    "updatedAt should change after update",
    updated.updatedAt,
    created.updatedAt,
  );
  TestValidator.equals(
    "fetched.updatedAt should match updated.updatedAt",
    fetched.updatedAt,
    updated.updatedAt,
  );

  // 8. Sanity predicates on timestamps being non-empty ISO strings
  TestValidator.predicate(
    "createdAt should be a non-empty ISO string",
    fetched.createdAt.length > 0,
  );
  TestValidator.predicate(
    "updatedAt should be a non-empty ISO string",
    fetched.updatedAt.length > 0,
  );
}
