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
 * Validate hard deletion of community platform account restriction episodes by
 * an authenticated adminUser.
 *
 * Business workflow:
 *
 * 1. Register an adminUser via POST /auth/adminUser/join and rely on the SDK to
 *    attach the access token.
 * 2. As this adminUser, create a new account restriction via POST
 *    /communityPlatform/adminUser/accountRestrictions.
 * 3. Confirm the restriction exists via GET
 *    /communityPlatform/adminUser/accountRestrictions/{accountRestrictionId}
 *    and via a search on PATCH
 *    /communityPlatform/adminUser/accountRestrictions.
 * 4. Hard delete the restriction via DELETE
 *    /communityPlatform/adminUser/accountRestrictions/{accountRestrictionId}.
 * 5. Verify the restriction is no longer retrievable by id and no longer appears
 *    in the paginated search list.
 */
export async function test_api_account_restriction_hard_delete_by_adminuser(
  connection: api.IConnection,
) {
  // 1. Admin join (authentication bootstrap)
  const joinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
  } satisfies ICommunityPlatformAdminUserJoin.IRequest;

  const adminAuthorized: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: joinBody,
    });
  typia.assert(adminAuthorized);

  // 2. Create a new account restriction episode
  const now = new Date();
  const startsAt = now.toISOString();
  const endsAt = new Date(now.getTime() + 60 * 60 * 1000).toISOString(); // +1h window

  const createBody = {
    account_type: "memberUser",
    scope: "login",
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

  // 3-a. Confirm existence via detail endpoint
  const fetchedRestriction: ICommunityPlatformAccountRestriction =
    await api.functional.communityPlatform.adminUser.accountRestrictions.at(
      connection,
      { accountRestrictionId: createdRestriction.id },
    );
  typia.assert(fetchedRestriction);
  TestValidator.equals(
    "created and fetched restriction ids must match",
    fetchedRestriction.id,
    createdRestriction.id,
  );

  // 3-b. Optionally confirm appearance in search index
  const searchBody = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 10 as number & tags.Type<"int32"> & tags.Minimum<1>,
    sort_by: "created_at",
    sort_direction: "desc" as const,
    reason_category: createBody.reason_category,
    created_at_gte: createdRestriction.created_at,
    created_at_lte: createdRestriction.created_at,
    subject_username: null,
    subject_type: null,
    restriction_type: null,
    is_active: null,
    effective_from_gte: null,
    effective_from_lte: null,
    effective_until_gte: null,
    effective_until_lte: null,
  } satisfies ICommunityPlatformAccountRestriction.IRequest;

  const searchPageBefore: IPageICommunityPlatformAccountRestriction.ISummary =
    await api.functional.communityPlatform.adminUser.accountRestrictions.index(
      connection,
      { body: searchBody },
    );
  typia.assert(searchPageBefore);

  const existedInListBefore = searchPageBefore.data.some(
    (summary) => summary.id === createdRestriction.id,
  );
  TestValidator.predicate(
    "created restriction should appear in search index before deletion",
    existedInListBefore,
  );

  // 4. Hard delete the restriction episode
  await api.functional.communityPlatform.adminUser.accountRestrictions.erase(
    connection,
    { accountRestrictionId: createdRestriction.id },
  );

  // 5-a. Verify detail endpoint no longer returns the restriction
  await TestValidator.error(
    "fetching deleted restriction by id should fail",
    async () => {
      await api.functional.communityPlatform.adminUser.accountRestrictions.at(
        connection,
        { accountRestrictionId: createdRestriction.id },
      );
    },
  );

  // 5-b. Verify the restriction no longer appears in the search index
  const searchPageAfter: IPageICommunityPlatformAccountRestriction.ISummary =
    await api.functional.communityPlatform.adminUser.accountRestrictions.index(
      connection,
      { body: searchBody },
    );
  typia.assert(searchPageAfter);

  const existsInListAfter = searchPageAfter.data.some(
    (summary) => summary.id === createdRestriction.id,
  );
  TestValidator.predicate(
    "deleted restriction should not appear in search index after deletion",
    existsInListAfter === false,
  );
}
