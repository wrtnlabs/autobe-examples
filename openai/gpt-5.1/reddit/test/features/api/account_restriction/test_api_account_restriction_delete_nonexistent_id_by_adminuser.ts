import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountRestriction } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountRestriction";
import type { ICommunityPlatformAccountRestrictionOfAdminUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountRestrictionOfAdminUser";
import type { ICommunityPlatformAccountRestrictionOfMemberUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountRestrictionOfMemberUser";
import type { ICommunityPlatformAdminUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminUserJoin";
import type { ICommunityPlatformAdminuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminuser";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformAccountRestriction } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformAccountRestriction";

/**
 * Validate that deleting a non-existent account restriction by ID fails without
 * side effects.
 *
 * Business purpose:
 *
 * - Ensure that the DELETE
 *   /communityPlatform/adminUser/accountRestrictions/{accountRestrictionId}
 *   endpoint correctly distinguishes between existing and non-existing IDs.
 * - Confirm that attempting to delete a non-existent restriction results in an
 *   error and does not modify any existing restrictions.
 * - Protect moderation history integrity by ensuring erroneous delete operations
 *   are safely rejected.
 *
 * Scenario steps:
 *
 * 1. Register an adminUser via /auth/adminUser/join so that the connection becomes
 *    authenticated as an admin actor.
 * 2. Create a valid account restriction via POST
 *    /communityPlatform/adminUser/accountRestrictions.
 * 3. List account restrictions via PATCH
 *    /communityPlatform/adminUser/accountRestrictions to capture a "before"
 *    snapshot of restrictions, including the one we just created.
 * 4. Generate a random UUID that is guaranteed to differ from the created
 *    restriction's id.
 * 5. Attempt to delete the non-existent restriction via DELETE
 *    /communityPlatform/adminUser/accountRestrictions/{accountRestrictionId}
 *    and assert that the call throws an error using TestValidator.error. We do
 *    not assert the exact HTTP status code; any error indicates the deletion
 *    has failed as desired.
 * 6. List account restrictions again with the same search request and capture the
 *    "after" snapshot.
 * 7. Assert that:
 *
 *    - The before and after lists are structurally equal, proving no restriction was
 *         removed or modified.
 *    - The originally created restriction id is still present in the after list.
 */
export async function test_api_account_restriction_delete_nonexistent_id_by_adminuser(
  connection: api.IConnection,
) {
  // 1. Register an adminUser and authenticate the connection
  const joinBody = typia.random<ICommunityPlatformAdminUserJoin.IRequest>();
  const adminAuthorized: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: joinBody,
    });
  typia.assert(adminAuthorized);

  // 2. Create a valid account restriction
  const createBodyBase =
    typia.random<ICommunityPlatformAccountRestriction.ICreate>();
  const createBody = {
    ...createBodyBase,
  } satisfies ICommunityPlatformAccountRestriction.ICreate;

  const createdRestriction: ICommunityPlatformAccountRestriction =
    await api.functional.communityPlatform.adminUser.accountRestrictions.create(
      connection,
      { body: createBody },
    );
  typia.assert(createdRestriction);

  // 3. Capture "before" snapshot via index
  const indexRequestBody = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 50 as number & tags.Type<"int32"> & tags.Minimum<1>,
    sort_by: null,
    sort_direction: null,
    subject_username: null,
    subject_type: null,
    restriction_type: null,
    is_active: null,
    effective_from_gte: null,
    effective_from_lte: null,
    effective_until_gte: null,
    effective_until_lte: null,
    reason_category: null,
    created_at_gte: null,
    created_at_lte: null,
  } satisfies ICommunityPlatformAccountRestriction.IRequest;

  const beforePage: IPageICommunityPlatformAccountRestriction.ISummary =
    await api.functional.communityPlatform.adminUser.accountRestrictions.index(
      connection,
      { body: indexRequestBody },
    );
  typia.assert(beforePage);

  // Ensure that our created restriction appears in the before snapshot
  const beforeHasCreated = beforePage.data.some(
    (summary) => summary.id === createdRestriction.id,
  );
  TestValidator.predicate(
    "before snapshot should contain created restriction",
    beforeHasCreated,
  );

  // 4. Generate a different random UUID that does not match the created one
  let nonexistentId = typia.random<string & tags.Format<"uuid">>();
  if (nonexistentId === createdRestriction.id) {
    nonexistentId = typia.random<string & tags.Format<"uuid">>();
  }

  // 5. Attempt to delete the non-existent restriction, expecting an error
  await TestValidator.error(
    "deleting non-existent restriction should fail",
    async () => {
      await api.functional.communityPlatform.adminUser.accountRestrictions.erase(
        connection,
        { accountRestrictionId: nonexistentId },
      );
    },
  );

  // 6. Capture "after" snapshot via index with the same request
  const afterPage: IPageICommunityPlatformAccountRestriction.ISummary =
    await api.functional.communityPlatform.adminUser.accountRestrictions.index(
      connection,
      { body: indexRequestBody },
    );
  typia.assert(afterPage);

  // 7a. Assert that before and after lists are structurally equal
  TestValidator.equals(
    "restriction list should be unchanged after failed delete",
    beforePage.data,
    afterPage.data,
  );

  // 7b. Confirm the originally created restriction still exists
  const afterHasCreated = afterPage.data.some(
    (summary) => summary.id === createdRestriction.id,
  );
  TestValidator.predicate(
    "created restriction should still exist after failed delete",
    afterHasCreated,
  );
}
