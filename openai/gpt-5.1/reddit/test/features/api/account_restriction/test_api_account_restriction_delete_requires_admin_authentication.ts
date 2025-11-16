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
 * Ensure account restrictions cannot be deleted without admin authentication.
 *
 * Business purpose:
 *
 * - Protect moderation history and enforcement integrity by requiring
 *   authenticated adminUser context for destructive operations on account
 *   restrictions.
 * - Confirm that anonymous callers (no Authorization header) cannot delete
 *   entries from community_platform_account_restrictions.
 *
 * Test workflow:
 *
 * 1. Register and authenticate an adminUser using /auth/adminUser/join.
 * 2. As this adminUser, create an account restriction episode using POST
 *    /communityPlatform/adminUser/accountRestrictions.
 * 3. Attempt to delete that restriction using an unauthenticated connection.
 *
 *    - Expect the call to fail and throw an error.
 * 4. Re-fetch the restriction by ID using GET
 *    /communityPlatform/adminUser/accountRestrictions/{accountRestrictionId}
 *    with the authenticated admin connection.
 *
 *    - Confirm that the restriction still exists via typia.assert.
 * 5. Search restrictions via PATCH
 *    /communityPlatform/adminUser/accountRestrictions with a filter that can
 *    match the created restriction.
 *
 *    - Confirm that the created restriction still appears in the result list.
 */
export async function test_api_account_restriction_delete_requires_admin_authentication(
  connection: api.IConnection,
) {
  // 1. Register and authenticate an adminUser
  const adminJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
  } satisfies ICommunityPlatformAdminUserJoin.IRequest;

  const adminAuthorized: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 2. Create an account restriction as this adminUser
  const now = new Date();
  const startsAt = now.toISOString();
  const endsAt = new Date(now.getTime() + 60 * 60 * 1000).toISOString(); // +1 hour

  const createBody = {
    account_type: "memberUser",
    scope: "posting",
    reason_category: "abuse",
    reason_detail: RandomGenerator.paragraph({ sentences: 3 }),
    starts_at: startsAt,
    ends_at: endsAt,
  } satisfies ICommunityPlatformAccountRestriction.ICreate;

  const createdRestriction: ICommunityPlatformAccountRestriction =
    await api.functional.communityPlatform.adminUser.accountRestrictions.create(
      connection,
      { body: createBody },
    );
  typia.assert(createdRestriction);

  // 3. Attempt to delete using an unauthenticated connection
  const unauthenticatedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  await TestValidator.error("unauthenticated delete must fail", async () => {
    await api.functional.communityPlatform.adminUser.accountRestrictions.erase(
      unauthenticatedConnection,
      { accountRestrictionId: createdRestriction.id },
    );
  });

  // 4. Ensure the restriction still exists via GET by ID using authenticated admin connection
  const fetchedAfterUnauthorizedDelete: ICommunityPlatformAccountRestriction =
    await api.functional.communityPlatform.adminUser.accountRestrictions.at(
      connection,
      { accountRestrictionId: createdRestriction.id },
    );
  typia.assert(fetchedAfterUnauthorizedDelete);

  TestValidator.equals(
    "restriction id remains unchanged after unauthorized delete attempt",
    fetchedAfterUnauthorizedDelete.id,
    createdRestriction.id,
  );

  // 5. Verify via index/search that restriction remains present
  const indexBody = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 10 as number & tags.Type<"int32"> & tags.Minimum<1>,
    sort_by: "created_at",
    sort_direction: "desc" as const,
    subject_username: null,
    subject_type: null,
    restriction_type: null,
    is_active: null,
    effective_from_gte: null,
    effective_from_lte: null,
    effective_until_gte: null,
    effective_until_lte: null,
    reason_category: createdRestriction.reason_category,
    created_at_gte: null,
    created_at_lte: null,
  } satisfies ICommunityPlatformAccountRestriction.IRequest;

  const indexResult: IPageICommunityPlatformAccountRestriction.ISummary =
    await api.functional.communityPlatform.adminUser.accountRestrictions.index(
      connection,
      { body: indexBody },
    );
  typia.assert(indexResult);

  const existsInIndex = indexResult.data.some((summary) => {
    return summary.id === createdRestriction.id;
  });

  TestValidator.predicate(
    "restriction must still appear in index after unauthorized delete attempt",
    existsInIndex,
  );
}
