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

export async function test_api_account_restriction_detail_reflects_updates(
  connection: api.IConnection,
) {
  // 1. Join as adminUser to get an authenticated admin context
  const joinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
  } satisfies ICommunityPlatformAdminUserJoin.IRequest;

  const adminAuthorized: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: joinBody,
    });
  typia.assert(adminAuthorized);

  // 2. Create an initial account restriction episode
  const now = new Date();
  const startsAt = new Date(now.getTime() + 1 * 60 * 1000).toISOString(); // start 1 minute in the future
  const endsAt = new Date(now.getTime() + 60 * 60 * 1000).toISOString(); // end 1 hour in the future

  const createBody = {
    account_type: "memberUser",
    scope: "posting",
    reason_category: "abuse",
    reason_detail: RandomGenerator.paragraph({ sentences: 5 }),
    starts_at: startsAt,
    ends_at: endsAt,
  } satisfies ICommunityPlatformAccountRestriction.ICreate;

  const created: ICommunityPlatformAccountRestriction =
    await api.functional.communityPlatform.adminUser.accountRestrictions.create(
      connection,
      { body: createBody },
    );
  typia.assert(created);

  // Capture baseline immutable and original values
  const originalId = created.id;
  const originalScope = created.scope;
  const originalReasonCategory = created.reason_category;
  const originalReasonDetail = created.reason_detail ?? null;
  const originalStartsAt = created.starts_at;
  const originalEndsAt = created.ends_at ?? null;
  const originalCreatedAt = created.created_at;
  const originalUpdatedAt = created.updated_at;

  // 3. Prepare update payload with business-significant changes
  const updatedEndsAt = new Date(
    now.getTime() + 2 * 60 * 60 * 1000,
  ).toISOString(); // extend to 2 hours in future
  const updatedStartsAt = new Date(now.getTime() + 2 * 60 * 1000).toISOString(); // slightly later start

  const updateBody = {
    scope: "full", // escalate scope
    reason_category: "policy_violation", // re-categorize reason
    reason_detail: RandomGenerator.paragraph({ sentences: 6 }), // new narrative
    starts_at: updatedStartsAt,
    ends_at: updatedEndsAt,
  } satisfies ICommunityPlatformAccountRestriction.IUpdate;

  const updated: ICommunityPlatformAccountRestriction =
    await api.functional.communityPlatform.adminUser.accountRestrictions.update(
      connection,
      {
        accountRestrictionId: created.id,
        body: updateBody,
      },
    );
  typia.assert(updated);

  // 4. Fetch detail via GET /accountRestrictions/{accountRestrictionId}
  const detail: ICommunityPlatformAccountRestriction =
    await api.functional.communityPlatform.adminUser.accountRestrictions.at(
      connection,
      { accountRestrictionId: created.id },
    );
  typia.assert(detail);

  // 5. Validate that updated fields are reflected in both update response and detail
  // Scope
  TestValidator.equals(
    "update response scope should match update payload",
    updated.scope,
    updateBody.scope,
  );
  TestValidator.equals(
    "detail scope should match update payload",
    detail.scope,
    updateBody.scope,
  );
  TestValidator.notEquals(
    "scope should differ from original",
    updated.scope,
    originalScope,
  );

  // Reason category
  TestValidator.equals(
    "update response reason_category should match update payload",
    updated.reason_category,
    updateBody.reason_category,
  );
  TestValidator.equals(
    "detail reason_category should match update payload",
    detail.reason_category,
    updateBody.reason_category,
  );
  TestValidator.notEquals(
    "reason_category should differ from original",
    updated.reason_category,
    originalReasonCategory,
  );

  // Reason detail (nullable string)
  const updatedReasonDetail = updated.reason_detail ?? null;
  const detailReasonDetail = detail.reason_detail ?? null;

  TestValidator.equals(
    "update response reason_detail should match update payload",
    updatedReasonDetail,
    updateBody.reason_detail ?? null,
  );
  TestValidator.equals(
    "detail reason_detail should match update payload",
    detailReasonDetail,
    updateBody.reason_detail ?? null,
  );
  TestValidator.notEquals(
    "reason_detail should differ from original when original existed",
    updatedReasonDetail,
    originalReasonDetail,
  );

  // Temporal window: starts_at and ends_at
  TestValidator.equals(
    "update response starts_at should match update payload",
    updated.starts_at,
    updateBody.starts_at!,
  );
  TestValidator.equals(
    "detail starts_at should match update payload",
    detail.starts_at,
    updateBody.starts_at!,
  );

  const updatedEndsAtValue = updated.ends_at ?? null;
  const detailEndsAtValue = detail.ends_at ?? null;

  TestValidator.equals(
    "update response ends_at should match update payload",
    updatedEndsAtValue,
    updateBody.ends_at ?? null,
  );
  TestValidator.equals(
    "detail ends_at should match update payload",
    detailEndsAtValue,
    updateBody.ends_at ?? null,
  );
  TestValidator.notEquals(
    "ends_at should differ from original when original existed",
    updatedEndsAtValue,
    originalEndsAt,
  );

  // 6. Immutable fields: id and created_at must remain constant
  TestValidator.equals(
    "updated id should equal created id",
    updated.id,
    originalId,
  );
  TestValidator.equals(
    "detail id should equal created id",
    detail.id,
    originalId,
  );

  TestValidator.equals(
    "updated created_at should equal original created_at",
    updated.created_at,
    originalCreatedAt,
  );
  TestValidator.equals(
    "detail created_at should equal original created_at",
    detail.created_at,
    originalCreatedAt,
  );

  // 7. updated_at should move forward on update and be reflected in detail
  TestValidator.predicate(
    "updated_at after update should be later than original updated_at",
    new Date(updated.updated_at).getTime() >=
      new Date(originalUpdatedAt).getTime(),
  );
  TestValidator.predicate(
    "detail updated_at should be at least as recent as update response",
    new Date(detail.updated_at).getTime() >=
      new Date(updated.updated_at).getTime(),
  );
}
