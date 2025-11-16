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

export async function test_api_admin_member_account_restriction_update_scope_and_reason_audit_consistency(
  connection: api.IConnection,
) {
  // 1. Register an adminUser and obtain authorized context
  const adminJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
  } satisfies ICommunityPlatformAdminUserJoin.IRequest;

  const adminAuthorized: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminJoinBody,
    });
  typia.assert<ICommunityPlatformAdminuser.IAuthorized>(adminAuthorized);

  // 2. Create a base account restriction episode (not yet bound to a member)
  const baseScope = "commenting";
  const baseReasonCategory = "harassment";
  const baseReasonDetail = RandomGenerator.paragraph({ sentences: 3 });
  const now = new Date();
  const startsAt = now.toISOString();
  const endsAt = new Date(now.getTime() + 60 * 60 * 1000).toISOString();

  const createRestrictionBody = {
    account_type: "memberUser",
    scope: baseScope,
    reason_category: baseReasonCategory,
    reason_detail: baseReasonDetail,
    starts_at: startsAt,
    ends_at: endsAt,
  } satisfies ICommunityPlatformAccountRestriction.ICreate;

  const baseRestriction: ICommunityPlatformAccountRestriction =
    await api.functional.communityPlatform.adminUser.accountRestrictions.create(
      connection,
      {
        body: createRestrictionBody,
      },
    );
  typia.assert<ICommunityPlatformAccountRestriction>(baseRestriction);

  // 3. Link the restriction to a concrete member user by username
  const memberUsername: string = RandomGenerator.name(1);

  const memberLinkedRestriction: ICommunityPlatformAccountRestriction =
    await api.functional.communityPlatform.adminUser.memberUsers.accountRestrictions.create(
      connection,
      {
        username: memberUsername,
        body: createRestrictionBody,
      },
    );
  typia.assert<ICommunityPlatformAccountRestriction>(memberLinkedRestriction);

  const originalId = memberLinkedRestriction.id;
  const originalAccountType = memberLinkedRestriction.account_type;
  const originalMemberRestriction =
    memberLinkedRestriction.memberUserRestriction;
  const originalAdminRestriction = memberLinkedRestriction.adminUserRestriction;
  const originalCreatedByAdminUser = memberLinkedRestriction.createdByAdminUser;
  const originalCreatedAt = memberLinkedRestriction.created_at;
  const originalUpdatedAt = memberLinkedRestriction.updated_at;

  // 4. Perform update: broaden scope, change reason_category and reason_detail
  const updatedScope = "full";
  const updatedReasonCategory = "abuse";
  const updatedReasonDetail = RandomGenerator.paragraph({ sentences: 4 });

  const updateBody = {
    scope: updatedScope,
    reason_category: updatedReasonCategory,
    reason_detail: updatedReasonDetail,
  } satisfies ICommunityPlatformAccountRestriction.IUpdate;

  const updatedRestriction: ICommunityPlatformAccountRestriction =
    await api.functional.communityPlatform.adminUser.memberUsers.accountRestrictions.update(
      connection,
      {
        username: memberUsername,
        accountRestrictionId: memberLinkedRestriction.id,
        body: updateBody,
      },
    );
  typia.assert<ICommunityPlatformAccountRestriction>(updatedRestriction);

  // 5. Assertions: content fields updated, linkage and audit metadata consistent
  TestValidator.equals(
    "restriction id remains stable after update",
    updatedRestriction.id,
    originalId,
  );
  TestValidator.equals(
    "account_type remains unchanged after update",
    updatedRestriction.account_type,
    originalAccountType,
  );

  TestValidator.equals(
    "scope updated to the broader enforcement domain",
    updatedRestriction.scope,
    updatedScope,
  );
  TestValidator.equals(
    "reason_category updated as requested",
    updatedRestriction.reason_category,
    updatedReasonCategory,
  );
  TestValidator.equals(
    "reason_detail updated as requested",
    updatedRestriction.reason_detail ?? null,
    updatedReasonDetail,
  );

  TestValidator.equals(
    "member user linkage is preserved across update",
    updatedRestriction.memberUserRestriction ?? null,
    originalMemberRestriction ?? null,
  );
  TestValidator.equals(
    "admin user linkage remains unchanged across update",
    updatedRestriction.adminUserRestriction ?? null,
    originalAdminRestriction ?? null,
  );

  TestValidator.equals(
    "createdByAdminUser still refers to the creating admin",
    updatedRestriction.createdByAdminUser ?? null,
    originalCreatedByAdminUser ?? null,
  );

  TestValidator.equals(
    "created_at stays immutable across update",
    updatedRestriction.created_at,
    originalCreatedAt,
  );

  await TestValidator.predicate(
    "updated_at is not earlier than original updated_at after update",
    async () => updatedRestriction.updated_at >= originalUpdatedAt,
  );
}
