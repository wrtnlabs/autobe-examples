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

/**
 * Validate that an authenticated adminUser can retrieve full details of a
 * specific account restriction episode by its unique identifier.
 *
 * Business context: Moderation staff (adminUser actors) need to be able to
 * drill into a particular account restriction from a list or case view and see
 * a consistent, fully-populated representation of the restriction episode for
 * enforcement review and appeals handling. This test exercises the happy path
 * of that flow by creating a concrete restriction episode as an admin and then
 * immediately reloading it by id.
 *
 * Test steps:
 *
 * 1. Register a new adminUser via POST /auth/adminUser/join using
 *    api.functional.auth.adminUser.join. This both creates the admin account
 *    and establishes an authenticated context (the SDK updates the connection
 *    token automatically).
 * 2. Using the authenticated admin context, create a new account restriction
 *    episode by calling
 *    api.functional.communityPlatform.adminUser.accountRestrictions.create with
 *    a body that satisfies ICommunityPlatformAccountRestriction.ICreate. The
 *    body must set account_type, scope, reason_category, optional
 *    reason_detail, and a logical temporal window using starts_at and ends_at
 *    ISO 8601 date-time strings.
 * 3. Capture the id of the created restriction from the create() response.
 * 4. Call api.functional.communityPlatform.adminUser.accountRestrictions.at with
 *    that id to retrieve the detailed restriction record.
 * 5. Use typia.assert on both create() and at() responses to ensure full schema
 *    conformity.
 * 6. Validate with TestValidator that core primitive fields (id, account_type,
 *    scope, reason_category, reason_detail, starts_at, ends_at) of the fetched
 *    record line up with what was created, allowing for server-managed fields
 *    such as created_at/updated_at and potential normalization of temporal
 *    values. Specifically, assert at minimum that:
 *
 *    - Fetched.id equals created.id
 *    - Fetched.account_type equals created.account_type
 *    - Fetched.scope equals created.scope
 *    - Fetched.reason_category equals created.reason_category
 *    - Fetched.reason_detail equals created.reason_detail
 *    - Fetched.starts_at equals created.starts_at
 *    - Fetched.ends_at equals created.ends_at
 * 7. Additionally, check that the linkage and creator summary fields are
 *    structurally sane without assuming their exact values:
 *
 *    - MemberUserRestriction and adminUserRestriction may be null, undefined, or
 *         populated; if present, typia.assert on their respective summary types
 *         passes.
 *    - CreatedByAdminUser may be null/undefined or populated; if populated,
 *         typia.assert on ICommunityPlatformAdminuser.ISummary.
 */
export async function test_api_account_restriction_detail_retrieval_by_id(
  connection: api.IConnection,
) {
  // 1. Register an adminUser and obtain an authorized context.
  const adminJoinRequest =
    typia.random<ICommunityPlatformAdminUserJoin.IRequest>();
  const adminAuthorized: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminJoinRequest,
    });
  typia.assert(adminAuthorized);

  // 2. Create a new account restriction episode as this adminUser.
  const now = new Date();
  const startsAt = now.toISOString();
  const endsAt = new Date(now.getTime() + 60 * 60 * 1000).toISOString();

  const createBody = {
    account_type: "memberUser",
    scope: "posting",
    reason_category: "policy_violation",
    reason_detail: RandomGenerator.paragraph({ sentences: 5 }),
    starts_at: startsAt,
    ends_at: endsAt,
  } satisfies ICommunityPlatformAccountRestriction.ICreate;

  const createdRestriction: ICommunityPlatformAccountRestriction =
    await api.functional.communityPlatform.adminUser.accountRestrictions.create(
      connection,
      { body: createBody },
    );
  typia.assert(createdRestriction);

  // 3. Retrieve the restriction by id using the detail endpoint.
  const fetchedRestriction: ICommunityPlatformAccountRestriction =
    await api.functional.communityPlatform.adminUser.accountRestrictions.at(
      connection,
      { accountRestrictionId: createdRestriction.id },
    );
  typia.assert(fetchedRestriction);

  // 4. Core field equality checks between created and fetched.
  TestValidator.equals(
    "restriction id should match between create and fetch",
    fetchedRestriction.id,
    createdRestriction.id,
  );
  TestValidator.equals(
    "account_type should match between create and fetch",
    fetchedRestriction.account_type,
    createdRestriction.account_type,
  );
  TestValidator.equals(
    "scope should match between create and fetch",
    fetchedRestriction.scope,
    createdRestriction.scope,
  );
  TestValidator.equals(
    "reason_category should match between create and fetch",
    fetchedRestriction.reason_category,
    createdRestriction.reason_category,
  );
  TestValidator.equals(
    "reason_detail should match between create and fetch",
    fetchedRestriction.reason_detail ?? null,
    createdRestriction.reason_detail ?? null,
  );
  TestValidator.equals(
    "starts_at should match between create and fetch",
    fetchedRestriction.starts_at,
    createdRestriction.starts_at,
  );
  TestValidator.equals(
    "ends_at should match between create and fetch",
    fetchedRestriction.ends_at ?? null,
    createdRestriction.ends_at ?? null,
  );

  // 5. Structural sanity checks for linkage summaries if present.
  if (
    fetchedRestriction.memberUserRestriction !== null &&
    fetchedRestriction.memberUserRestriction !== undefined
  ) {
    typia.assert<ICommunityPlatformAccountRestrictionOfMemberUser.ISummary>(
      fetchedRestriction.memberUserRestriction,
    );
  }

  if (
    fetchedRestriction.adminUserRestriction !== null &&
    fetchedRestriction.adminUserRestriction !== undefined
  ) {
    typia.assert<ICommunityPlatformAccountRestrictionOfAdminUser.ISummary>(
      fetchedRestriction.adminUserRestriction,
    );
  }

  if (
    fetchedRestriction.createdByAdminUser !== null &&
    fetchedRestriction.createdByAdminUser !== undefined
  ) {
    typia.assert<ICommunityPlatformAdminuser.ISummary>(
      fetchedRestriction.createdByAdminUser,
    );
  }
}
