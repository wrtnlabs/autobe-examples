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
 * Adjust temporal window of an existing account restriction episode as an
 * authenticated adminUser.
 *
 * Business goal: Ensure that an adminUser who originally has authority to
 * create account restriction episodes can later adjust the temporal window
 * (`starts_at`/`ends_at`) of that restriction without affecting other immutable
 * or unrelated attributes. This validates that the update endpoint cleanly
 * supports time-window adjustments while preserving core identity and
 * metadata.
 *
 * End-to-end steps:
 *
 * 1. Register a new adminUser via POST /auth/adminUser/join, using a random but
 *    valid ICommunityPlatformAdminUserJoin.IRequest payload. The SDK
 *    automatically writes the access token into
 *    connection.headers.Authorization, so no manual token handling is needed.
 * 2. With the authenticated admin context, create a new account restriction
 *    episode via POST /communityPlatform/adminUser/accountRestrictions using an
 *    ICommunityPlatformAccountRestriction.ICreate body:
 *
 *    - Account_type: some string discriminator, e.g., "memberUser" or "adminUser".
 *    - Scope: e.g., "posting" or "login".
 *    - Reason_category: e.g., "abuse".
 *    - Reason_detail: optional; supply some random paragraph text.
 *    - Starts_at: an ISO 8601 date-time string representing now or a near-future
 *         moment.
 *    - Ends_at: an ISO 8601 date-time string several days after starts_at (finite
 *         window).
 * 3. Capture the returned ICommunityPlatformAccountRestriction as `before` and
 *    typia.assert it.
 * 4. Construct an ICommunityPlatformAccountRestriction.IUpdate payload
 *    `updateBody` that only changes the temporal fields:
 *
 *    - Starts_at: either keep the same or move slightly earlier/later as a valid ISO
 *         string.
 *    - Ends_at: extend the window by several days (e.g., +3 days vs original
 *         ends_at). All other properties in IUpdate (scope, reason_category,
 *         reason_detail) must be left `undefined` so that the server treats
 *         them as "no change".
 * 5. Call PUT
 *    /communityPlatform/adminUser/accountRestrictions/{accountRestrictionId}
 *    via api.functional.communityPlatform.adminUser.accountRestrictions.update,
 *    passing `accountRestrictionId: before.id` and `body: updateBody`.
 * 6. Receive the updated ICommunityPlatformAccountRestriction as `after` and
 *    validate:
 *
 *    - Typia.assert(after) succeeds (shape & formats correct).
 *    - `after.id` equals `before.id`.
 *    - `after.account_type` equals `before.account_type`.
 *    - `after.scope` equals `before.scope`.
 *    - `after.reason_category` equals `before.reason_category`.
 *    - `after.reason_detail` deep-equals `before.reason_detail` (including
 *         null/undefined).
 *    - `after.community_platform_adminuser_id` equals
 *         `before.community_platform_adminuser_id`.
 *    - `after.created_at` equals `before.created_at`.
 *    - `after.deleted_at` deep-equals `before.deleted_at`.
 *    - `after.memberUserRestriction` deep-equals `before.memberUserRestriction`.
 *    - `after.adminUserRestriction` deep-equals `before.adminUserRestriction`.
 *    - `after.createdByAdminUser` deep-equals `before.createdByAdminUser`.
 *    - `after.starts_at` and `after.ends_at` match the newly requested values (where
 *         provided in updateBody).
 *    - `after.updated_at` is strictly greater than `before.updated_at` when compared
 *         as ISO 8601 strings.
 *    - If both `after.starts_at` and `after.ends_at` are non-null, they satisfy
 *         `after.starts_at <= after.ends_at` in lexicographical order.
 * 7. Use TestValidator.equals / notEquals / predicate with descriptive titles for
 *    each business rule above. Avoid any type-error scenarios or invalid DTO
 *    shapes.
 */
export async function test_api_account_restriction_update_adjust_temporal_window(
  connection: api.IConnection,
) {
  // 1. Register adminUser (join) to obtain authorized context and token
  const joinBody = typia.random<ICommunityPlatformAdminUserJoin.IRequest>();
  const adminAuthorized: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: joinBody,
    });
  typia.assert(adminAuthorized);

  // 2. Create initial account restriction episode with finite temporal window
  const now = new Date();
  const startsAt = new Date(now.getTime() + 5 * 60 * 1000).toISOString();
  const endsAt = new Date(
    now.getTime() + 5 * 24 * 60 * 60 * 1000,
  ).toISOString();

  const createBody = {
    account_type: "memberUser",
    scope: "posting",
    reason_category: "abuse",
    reason_detail: RandomGenerator.paragraph({ sentences: 4 }),
    starts_at: startsAt,
    ends_at: endsAt,
  } satisfies ICommunityPlatformAccountRestriction.ICreate;

  const before: ICommunityPlatformAccountRestriction =
    await api.functional.communityPlatform.adminUser.accountRestrictions.create(
      connection,
      { body: createBody },
    );
  typia.assert(before);

  // 3. Build update payload extending ends_at and optionally adjusting starts_at
  const originalEndsAt = before.ends_at ?? endsAt;
  const originalEndsDate = new Date(originalEndsAt);
  const extendedEndsAt = new Date(
    originalEndsDate.getTime() + 3 * 24 * 60 * 60 * 1000,
  ).toISOString();

  const originalStartsDate = new Date(before.starts_at);
  const shiftedStartsAt = new Date(
    originalStartsDate.getTime() + 60 * 60 * 1000,
  ).toISOString();

  const updateBody = {
    starts_at: shiftedStartsAt,
    ends_at: extendedEndsAt,
  } satisfies ICommunityPlatformAccountRestriction.IUpdate;

  // 4. Perform the update
  const after: ICommunityPlatformAccountRestriction =
    await api.functional.communityPlatform.adminUser.accountRestrictions.update(
      connection,
      {
        accountRestrictionId: before.id,
        body: updateBody,
      },
    );
  typia.assert(after);

  // 5. Identity and immutability checks
  TestValidator.equals("restriction id remains unchanged", after.id, before.id);
  TestValidator.equals(
    "account_type remains unchanged",
    after.account_type,
    before.account_type,
  );
  TestValidator.equals("scope remains unchanged", after.scope, before.scope);
  TestValidator.equals(
    "reason_category remains unchanged",
    after.reason_category,
    before.reason_category,
  );
  TestValidator.equals(
    "reason_detail remains unchanged",
    after.reason_detail ?? null,
    before.reason_detail ?? null,
  );
  TestValidator.equals(
    "admin user id remains unchanged",
    after.community_platform_adminuser_id,
    before.community_platform_adminuser_id,
  );
  TestValidator.equals(
    "created_at remains unchanged",
    after.created_at,
    before.created_at,
  );
  TestValidator.equals(
    "deleted_at remains unchanged",
    after.deleted_at ?? null,
    before.deleted_at ?? null,
  );
  TestValidator.equals(
    "memberUserRestriction remains unchanged",
    after.memberUserRestriction ?? null,
    before.memberUserRestriction ?? null,
  );
  TestValidator.equals(
    "adminUserRestriction remains unchanged",
    after.adminUserRestriction ?? null,
    before.adminUserRestriction ?? null,
  );
  TestValidator.equals(
    "createdByAdminUser remains unchanged",
    after.createdByAdminUser ?? null,
    before.createdByAdminUser ?? null,
  );

  // 6. Temporal fields reflect update payload
  TestValidator.equals(
    "starts_at updated to requested value",
    after.starts_at,
    updateBody.starts_at,
  );
  TestValidator.equals(
    "ends_at updated to requested value",
    after.ends_at ?? null,
    updateBody.ends_at ?? null,
  );

  // 7. updated_at is more recent than before.updated_at
  TestValidator.predicate("updated_at is later than before.updated_at", () => {
    const beforeUpdated = new Date(before.updated_at).getTime();
    const afterUpdated = new Date(after.updated_at).getTime();
    return afterUpdated > beforeUpdated;
  });

  // 8. Temporal integrity: starts_at <= ends_at when both non-null
  if (after.ends_at !== null && after.ends_at !== undefined) {
    TestValidator.predicate(
      "starts_at is not later than ends_at after update",
      new Date(after.starts_at).getTime() <= new Date(after.ends_at).getTime(),
    );
  }

  // 9. Sanity checks on core fields
  TestValidator.predicate(
    "account_type is non-empty string",
    after.account_type.length > 0,
  );
  TestValidator.predicate("scope is non-empty string", after.scope.length > 0);
}
