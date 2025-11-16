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
 * Verify updating scope and reason fields of an existing account restriction.
 *
 * Business goal: Ensure that an authenticated adminUser can reclassify an
 * existing community-platform account restriction episode by changing its
 * mutable business attributes (scope, reason_category, reason_detail) via the
 * update endpoint while preserving immutable/audit fields and correctly
 * advancing updated_at. Also verify partial update semantics where unspecified
 * fields remain unchanged across updates.
 *
 * High-level steps:
 *
 * 1. Join an adminUser (POST /auth/adminUser/join) to obtain an authenticated
 *    administrative context.
 * 2. Create an initial restriction episode using POST
 *    /communityPlatform/adminUser/accountRestrictions with
 *    ICommunityPlatformAccountRestriction.ICreate.
 * 3. Capture baseline fields from the created restriction.
 * 4. Call PUT
 *    /communityPlatform/adminUser/accountRestrictions/{accountRestrictionId}
 *    with an ICommunityPlatformAccountRestriction.IUpdate payload that changes
 *    scope, reason_category, and reason_detail.
 * 5. Assert that mutable business fields are updated while id, account_type,
 *    community_platform_adminuser_id, created_at, and deletion/linkage
 *    identifiers remain stable. Also assert that updated_at has changed.
 * 6. Perform a second update that only changes reason_detail and verify that scope
 *    and reason_category remain from the first update while reason_detail and
 *    updated_at change again.
 */
export async function test_api_account_restriction_update_change_scope_and_reason(
  connection: api.IConnection,
) {
  // 1. Join an adminUser to obtain authenticated context.
  const adminJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
  } satisfies ICommunityPlatformAdminUserJoin.IRequest;

  const admin: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(admin);

  // 2. Create an initial restriction episode.
  const now = new Date();
  const startsAt = now.toISOString();
  const endsAt = new Date(now.getTime() + 60 * 60 * 1000).toISOString(); // +1 hour

  const createBody = {
    account_type: "member_user",
    scope: "posting",
    reason_category: "spam",
    reason_detail: RandomGenerator.paragraph({ sentences: 4 }),
    starts_at: startsAt,
    ends_at: endsAt,
  } satisfies ICommunityPlatformAccountRestriction.ICreate;

  const created: ICommunityPlatformAccountRestriction =
    await api.functional.communityPlatform.adminUser.accountRestrictions.create(
      connection,
      {
        body: createBody,
      },
    );
  typia.assert(created);

  // Baseline snapshot for comparison.
  const originalId = created.id;
  const originalAccountType = created.account_type;
  const originalAdminId = created.community_platform_adminuser_id;
  const originalCreatedAt = created.created_at;
  const originalUpdatedAt = created.updated_at;
  const originalScope = created.scope;
  const originalReasonCategory = created.reason_category;
  const originalReasonDetail = created.reason_detail ?? null;

  // 3. First update: change scope, reason_category, and reason_detail.
  const updatedScope1 = "full";
  const updatedReasonCategory1 = "abuse";
  const updatedReasonDetail1 = RandomGenerator.paragraph({ sentences: 3 });

  const updateBody1 = {
    scope: updatedScope1,
    reason_category: updatedReasonCategory1,
    reason_detail: updatedReasonDetail1,
  } satisfies ICommunityPlatformAccountRestriction.IUpdate;

  const updated1: ICommunityPlatformAccountRestriction =
    await api.functional.communityPlatform.adminUser.accountRestrictions.update(
      connection,
      {
        accountRestrictionId: created.id,
        body: updateBody1,
      },
    );
  typia.assert(updated1);

  // 4. Validate first update result.
  TestValidator.equals(
    "id remains unchanged after first update",
    updated1.id,
    originalId,
  );
  TestValidator.equals(
    "account_type remains unchanged after first update",
    updated1.account_type,
    originalAccountType,
  );
  TestValidator.equals(
    "creator admin id remains unchanged after first update",
    updated1.community_platform_adminuser_id,
    originalAdminId,
  );
  TestValidator.equals(
    "created_at remains unchanged after first update",
    updated1.created_at,
    originalCreatedAt,
  );
  TestValidator.notEquals(
    "updated_at changes after first update",
    updated1.updated_at,
    originalUpdatedAt,
  );

  TestValidator.equals(
    "scope updated to new value",
    updated1.scope,
    updatedScope1,
  );
  TestValidator.equals(
    "reason_category updated to new value",
    updated1.reason_category,
    updatedReasonCategory1,
  );
  TestValidator.equals(
    "reason_detail updated to new value",
    updated1.reason_detail ?? null,
    updatedReasonDetail1,
  );

  // 5. Second update: partial update only changing reason_detail.
  const updatedReasonDetail2 = RandomGenerator.paragraph({ sentences: 2 });

  const updateBody2 = {
    reason_detail: updatedReasonDetail2,
  } satisfies ICommunityPlatformAccountRestriction.IUpdate;

  const updated2: ICommunityPlatformAccountRestriction =
    await api.functional.communityPlatform.adminUser.accountRestrictions.update(
      connection,
      {
        accountRestrictionId: created.id,
        body: updateBody2,
      },
    );
  typia.assert(updated2);

  // 6. Validate second update result (partial update semantics).
  TestValidator.equals(
    "id remains unchanged after second update",
    updated2.id,
    originalId,
  );
  TestValidator.equals(
    "account_type remains unchanged after second update",
    updated2.account_type,
    originalAccountType,
  );
  TestValidator.equals(
    "creator admin id remains unchanged after second update",
    updated2.community_platform_adminuser_id,
    originalAdminId,
  );
  TestValidator.equals(
    "created_at remains unchanged after second update",
    updated2.created_at,
    originalCreatedAt,
  );
  TestValidator.notEquals(
    "updated_at changes again after second update",
    updated2.updated_at,
    updated1.updated_at,
  );

  // Scope and reason_category should keep the values from first update.
  TestValidator.equals(
    "scope preserved from first update on second update",
    updated2.scope,
    updatedScope1,
  );
  TestValidator.equals(
    "reason_category preserved from first update on second update",
    updated2.reason_category,
    updatedReasonCategory1,
  );

  // Only reason_detail changed.
  TestValidator.notEquals(
    "reason_detail changed between first and second update",
    updated2.reason_detail ?? null,
    updatedReasonDetail1,
  );
  TestValidator.equals(
    "reason_detail updated to latest value",
    updated2.reason_detail ?? null,
    updatedReasonDetail2,
  );
}
