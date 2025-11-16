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

export async function test_api_admin_member_account_restriction_update_active_window(
  connection: api.IConnection,
) {
  // 1. Admin join to obtain authorized adminUser context
  const adminJoinBody =
    typia.random<ICommunityPlatformAdminUserJoin.IRequest>();
  const adminAuthorized: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 2. Prepare a member username to target
  const targetUsername: string = RandomGenerator.alphabets(12);

  // 3. Create a generic restriction episode (not strictly required for linkage,
  //    but kept to follow scenario intent of having a base episode in the
  //    global restrictions table).
  const baseStartsAt: string = new Date().toISOString();
  const baseEndsAt: string = new Date(
    Date.now() + 60 * 60 * 1000,
  ).toISOString();

  const baseRestrictionCreateBody = {
    account_type: "memberUser",
    scope: "posting",
    reason_category: "abuse",
    reason_detail: RandomGenerator.paragraph({ sentences: 4 }),
    starts_at: baseStartsAt,
    ends_at: baseEndsAt,
  } satisfies ICommunityPlatformAccountRestriction.ICreate;

  const baseRestriction: ICommunityPlatformAccountRestriction =
    await api.functional.communityPlatform.adminUser.accountRestrictions.create(
      connection,
      {
        body: baseRestrictionCreateBody,
      },
    );
  typia.assert(baseRestriction);

  // 4. Create a member-user-scoped restriction for the chosen username
  const memberStartsAt: string = new Date(
    Date.now() + 5 * 60 * 1000,
  ).toISOString();
  const memberEndsAt: string = new Date(
    Date.now() + 2 * 60 * 60 * 1000,
  ).toISOString();

  const memberRestrictionCreateBody = {
    account_type: "memberUser",
    scope: "posting",
    reason_category: "abuse",
    reason_detail: RandomGenerator.paragraph({ sentences: 3 }),
    starts_at: memberStartsAt,
    ends_at: memberEndsAt,
  } satisfies ICommunityPlatformAccountRestriction.ICreate;

  const originalRestriction: ICommunityPlatformAccountRestriction =
    await api.functional.communityPlatform.adminUser.memberUsers.accountRestrictions.create(
      connection,
      {
        username: targetUsername,
        body: memberRestrictionCreateBody,
      },
    );
  typia.assert(originalRestriction);

  // 5. Build update payload to change scope, reasons, and temporal window
  const updatedStartsAt: string = new Date(
    Date.now() + 10 * 60 * 1000,
  ).toISOString();
  const updatedEndsAt: string = new Date(
    Date.now() + 3 * 60 * 60 * 1000,
  ).toISOString();

  const updateBody = {
    scope: "full",
    reason_category: "policy_violation",
    reason_detail: RandomGenerator.paragraph({ sentences: 5 }),
    starts_at: updatedStartsAt,
    ends_at: updatedEndsAt,
  } satisfies ICommunityPlatformAccountRestriction.IUpdate;

  // 6. Invoke update API
  const updatedRestriction: ICommunityPlatformAccountRestriction =
    await api.functional.communityPlatform.adminUser.memberUsers.accountRestrictions.update(
      connection,
      {
        username: targetUsername,
        accountRestrictionId: originalRestriction.id,
        body: updateBody,
      },
    );
  typia.assert(updatedRestriction);

  // 7. Validate invariants and updates
  // Identity should be immutable
  TestValidator.equals(
    "restriction id remains unchanged after update",
    updatedRestriction.id,
    originalRestriction.id,
  );
  TestValidator.equals(
    "account_type remains unchanged after update",
    updatedRestriction.account_type,
    originalRestriction.account_type,
  );

  // created_at should not change
  TestValidator.equals(
    "created_at remains unchanged after update",
    updatedRestriction.created_at,
    originalRestriction.created_at,
  );

  // Updated fields should reflect update payload
  TestValidator.equals(
    "scope is updated to new value",
    updatedRestriction.scope,
    updateBody.scope,
  );
  TestValidator.equals(
    "reason_category is updated to new value",
    updatedRestriction.reason_category,
    updateBody.reason_category,
  );
  TestValidator.equals(
    "reason_detail is updated to new value",
    updatedRestriction.reason_detail ?? null,
    updateBody.reason_detail ?? null,
  );
  TestValidator.equals(
    "starts_at is updated to new value",
    updatedRestriction.starts_at,
    updateBody.starts_at,
  );
  TestValidator.equals(
    "ends_at is updated to new value",
    updatedRestriction.ends_at ?? null,
    updateBody.ends_at ?? null,
  );

  // If linkage summaries are present, ensure they remain and keep core ids
  if (originalRestriction.memberUserRestriction != null) {
    TestValidator.predicate(
      "memberUserRestriction remains present after update",
      updatedRestriction.memberUserRestriction != null,
    );

    if (
      updatedRestriction.memberUserRestriction != null &&
      originalRestriction.memberUserRestriction.memberUser != null &&
      updatedRestriction.memberUserRestriction.memberUser != null
    ) {
      TestValidator.equals(
        "linked member user id remains the same",
        updatedRestriction.memberUserRestriction.memberUser.id,
        originalRestriction.memberUserRestriction.memberUser.id,
      );
    }
  }

  if (originalRestriction.createdByAdminUser != null) {
    TestValidator.predicate(
      "createdByAdminUser remains present after update",
      updatedRestriction.createdByAdminUser != null,
    );

    if (updatedRestriction.createdByAdminUser != null) {
      TestValidator.equals(
        "creating admin user id remains the same",
        updatedRestriction.createdByAdminUser.id,
        originalRestriction.createdByAdminUser.id,
      );
    }
  }
}
