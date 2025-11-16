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
 * Validate creation of adminUser account restrictions with both indefinite and
 * time-bounded windows.
 *
 * Business flow:
 *
 * 1. Create acting admin A via /auth/adminUser/join.
 * 2. Create target admin B via /auth/adminUser/join and capture B.username.
 * 3. As an authenticated admin user, create restriction R1 for B with ends_at =
 *    null (indefinite).
 * 4. Create restriction R2 for B with a concrete future ends_at timestamp.
 * 5. Assert both restrictions are properly created, have expected temporal fields,
 *    and coexist (different ids, same account_type, and same target admin when
 *    linkage summaries are present).
 */
export async function test_api_admin_user_account_restriction_creation_with_indefinite_and_bounded_windows(
  connection: api.IConnection,
) {
  // 1. Create acting admin A
  const adminJoinBodyA = {
    username: `adminA_${RandomGenerator.alphaNumeric(8)}`,
    email: `adminA_${RandomGenerator.alphaNumeric(8)}@example.com`,
    password: "AdminA_password1!",
  } satisfies ICommunityPlatformAdminUserJoin.IRequest;

  const adminA = await api.functional.auth.adminUser.join(connection, {
    body: adminJoinBodyA,
  });
  typia.assert(adminA);

  // 2. Create target admin B
  const adminJoinBodyB = {
    username: `adminB_${RandomGenerator.alphaNumeric(8)}`,
    email: `adminB_${RandomGenerator.alphaNumeric(8)}@example.com`,
    password: "AdminB_password1!",
  } satisfies ICommunityPlatformAdminUserJoin.IRequest;

  const adminB = await api.functional.auth.adminUser.join(connection, {
    body: adminJoinBodyB,
  });
  typia.assert(adminB);

  const targetUsername: string = adminB.username;

  // 3. Create R1: indefinite restriction (ends_at = null)
  const startsAtR1: string = new Date().toISOString();
  const createR1Body = {
    account_type: "adminUser",
    scope: "login",
    reason_category: "security",
    reason_detail: RandomGenerator.paragraph({ sentences: 5 }),
    starts_at: startsAtR1,
    ends_at: null,
  } satisfies ICommunityPlatformAccountRestriction.ICreate;

  const r1 =
    await api.functional.communityPlatform.adminUser.adminUsers.accountRestrictions.create(
      connection,
      {
        username: targetUsername,
        body: createR1Body,
      },
    );
  typia.assert(r1);

  // 4. Create R2: time-bounded restriction (ends_at in the future)
  const startsAtR2: string = new Date().toISOString();
  const futureDate = new Date(Date.now() + 60 * 60 * 1000); // 1 hour later
  const endsAtR2: string = futureDate.toISOString();

  const createR2Body = {
    account_type: "adminUser",
    scope: "posting",
    reason_category: "policy_violation",
    reason_detail: RandomGenerator.paragraph({ sentences: 5 }),
    starts_at: startsAtR2,
    ends_at: endsAtR2,
  } satisfies ICommunityPlatformAccountRestriction.ICreate;

  const r2 =
    await api.functional.communityPlatform.adminUser.adminUsers.accountRestrictions.create(
      connection,
      {
        username: targetUsername,
        body: createR2Body,
      },
    );
  typia.assert(r2);

  // 5. Business assertions
  // R1: ends_at must be null (indefinite window)
  const r1EndsAt: (string & tags.Format<"date-time">) | null | undefined =
    r1.ends_at;
  TestValidator.equals(
    "R1 should have null ends_at (indefinite)",
    r1EndsAt,
    null,
  );

  // R2: ends_at must equal the provided future timestamp
  // Narrow ends_at to plain string for comparison
  const r2EndsAtRaw = r2.ends_at;
  typia.assert<(string & tags.Format<"date-time">) | null | undefined>(
    r2EndsAtRaw,
  );
  const r2EndsAt: string | null = r2EndsAtRaw ?? null;
  TestValidator.equals("R2 should have non-null ends_at", r2EndsAt, endsAtR2);

  // Ensure R1 and R2 are separate episodes (different ids)
  TestValidator.notEquals("R1 and R2 must have different ids", r1.id, r2.id);

  // account_type should be preserved
  TestValidator.equals(
    "R1 account_type should be 'adminUser'",
    r1.account_type,
    "adminUser",
  );
  TestValidator.equals(
    "R2 account_type should be 'adminUser'",
    r2.account_type,
    "adminUser",
  );

  // Optional: when linkage summaries are present, they should point to same adminUser
  if (r1.adminUserRestriction && r2.adminUserRestriction) {
    TestValidator.equals(
      "Both restrictions should target the same adminUser (via linkage)",
      r1.adminUserRestriction.community_platform_adminuser_id,
      r2.adminUserRestriction.community_platform_adminuser_id,
    );
  }
}
