import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountStatus";
import type { ICommunityPlatformPlatformadmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPlatformadmin";

/**
 * Validate that a platform administrator can delete an unused account status.
 *
 * Business context: Platform administrators manage the master catalog of
 * account statuses (rows in community_platform_account_statuses) that control
 * whether accounts can log in, post, vote, and whether transitions require
 * manual review. A newly created status that is not yet referenced by any
 * account should be safely deletable by a platform admin.
 *
 * This test ensures that:
 *
 * 1. A platform admin can join (register) and become authenticated.
 * 2. The authenticated admin can create a new account status with a unique key and
 *    specific behavioral flags.
 * 3. The created account status is returned with a full
 *    ICommunityPlatformAccountStatus payload matching the request for
 *    key/label/flags.
 * 4. The same admin can delete that status using the erase endpoint with the
 *    created id as accountStatusId.
 * 5. The erase call completes successfully without throwing, which indicates that
 *    the account status was removed.
 */
export async function test_api_account_status_delete_success_by_platform_admin(
  connection: api.IConnection,
) {
  // 1) Register and authenticate a platform administrator.
  const adminJoinBody = typia.random<ICommunityPlatformPlatformadmin.IJoin>();

  const admin: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(admin);

  // At this point, the SDK has set connection.headers.Authorization
  // internally based on admin.token.access. We do not touch headers
  // directly in the test.

  // 2) Create a new, unique account status intended only for this test.
  const statusKeyPrefix = "TEST_STATUS_" as const;
  const statusKey = `${statusKeyPrefix}${RandomGenerator.alphaNumeric(16)}`;

  const createBody = {
    key: statusKey,
    label: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 4 }),
    isLoginAllowed: false,
    isPostingAllowed: false,
    isVotingAllowed: false,
    requiresManualReview: true,
  } satisfies ICommunityPlatformAccountStatus.ICreate;

  const createdStatus: ICommunityPlatformAccountStatus =
    await api.functional.communityPlatform.platformAdmin.accountStatuses.create(
      connection,
      {
        body: createBody,
      },
    );
  typia.assert(createdStatus);

  // Validate that key and basic behavioral flags match what we requested.
  TestValidator.equals(
    "created status key matches request",
    createdStatus.key,
    createBody.key,
  );
  TestValidator.equals(
    "created status label matches request",
    createdStatus.label,
    createBody.label,
  );
  TestValidator.equals(
    "created status login flag matches request",
    createdStatus.isLoginAllowed,
    createBody.isLoginAllowed,
  );
  TestValidator.equals(
    "created status posting flag matches request",
    createdStatus.isPostingAllowed,
    createBody.isPostingAllowed,
  );
  TestValidator.equals(
    "created status voting flag matches request",
    createdStatus.isVotingAllowed,
    createBody.isVotingAllowed,
  );
  TestValidator.equals(
    "created status manual review flag matches request",
    createdStatus.requiresManualReview,
    createBody.requiresManualReview,
  );

  // 3) Delete the newly created account status using its id.
  await api.functional.communityPlatform.platformAdmin.accountStatuses.erase(
    connection,
    {
      accountStatusId: createdStatus.id,
    },
  );

  // If erase completes without throwing an error, we consider the
  // deletion successful from the test perspective. There is no GET
  // endpoint available in this context to re-verify by id.
  TestValidator.predicate(
    "erase of newly created status completed without error",
    true,
  );
}
