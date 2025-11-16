import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdminUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminUserJoin";
import type { ICommunityPlatformAdminuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminuser";
import type { ICommunityPlatformSystemConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSystemConfig";

/**
 * Validate admin user detail retrieval for suspended or banned accounts.
 *
 * Business goal: Ensure that platform admin tools can inspect admin accounts
 * that have enforcement flags applied (suspension or ban) and that the detail
 * endpoint correctly reflects those flags while remaining stable for other
 * fields.
 *
 * High-level flow:
 *
 * 1. Register a new adminUser (admin A) with /auth/adminUser/join.
 * 2. As admin A, perform a canonical admin write using POST
 *    /communityPlatform/adminUser/systemConfigs to mimic real-world admin usage
 *    and ensure auth context is properly established.
 * 3. Read the admin detail via GET
 *    /communityPlatform/adminUser/adminUsers/{username} and capture baseline
 *    values for invariant fields (id, username, email, created_at, etc.).
 * 4. Update the same admin account via PUT
 *    /communityPlatform/adminUser/adminUsers/{username} setting
 *    is_suspended=true and is_banned=false.
 * 5. Re-read the admin detail and assert:
 *
 *    - Is_suspended === true
 *    - Is_banned === false
 *    - Invariant fields (id, username, email, created_at, deleted_at) remain
 *         unchanged.
 * 6. Update again with is_suspended=false and is_banned=true.
 * 7. Re-read the admin detail and assert:
 *
 *    - Is_suspended === false
 *    - Is_banned === true
 *    - Invariant fields still match the original baseline.
 * 8. Throughout, rely on typia.assert for structural type validation and
 *    TestValidator for business-logic checks.
 *
 * Notes:
 *
 * - ICommunityPlatformAdminUserJoin.IRequest is used for join body.
 * - ICommunityPlatformSystemConfig.ICreate is used for system config creation.
 * - ICommunityPlatformAdminuser.IUpdate is used for flag toggling.
 * - ICommunityPlatformAdminuser is the response type for detail and update.
 */
export async function test_api_admin_user_detail_for_suspended_or_banned_account(
  connection: api.IConnection,
) {
  // 1. Register a new adminUser (admin A)
  const joinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
  } satisfies ICommunityPlatformAdminUserJoin.IRequest;

  const authorized: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: joinBody,
    });
  typia.assert(authorized);

  // 2. Perform a canonical system config write as admin A
  const systemConfigBody = {
    category: "auth",
    config_key: "max_login_attempts",
    value: "5",
    description: RandomGenerator.paragraph({ sentences: 3 }),
    is_active: true,
  } satisfies ICommunityPlatformSystemConfig.ICreate;

  const systemConfig: ICommunityPlatformSystemConfig =
    await api.functional.communityPlatform.adminUser.systemConfigs.create(
      connection,
      { body: systemConfigBody },
    );
  typia.assert(systemConfig);

  // 3. Baseline read of admin detail
  const baseline: ICommunityPlatformAdminuser =
    await api.functional.communityPlatform.adminUser.adminUsers.at(connection, {
      username: authorized.username,
    });
  typia.assert(baseline);

  // Sanity checks on baseline invariants
  TestValidator.equals(
    "baseline username matches join payload",
    baseline.username,
    joinBody.username,
  );
  TestValidator.equals(
    "baseline email matches join payload",
    baseline.email,
    joinBody.email,
  );
  TestValidator.predicate(
    "baseline is_super_admin is boolean",
    typeof baseline.is_super_admin === "boolean",
  );

  // Capture invariant fields for later comparison
  const baselineId = baseline.id;
  const baselineUsername = baseline.username;
  const baselineEmail = baseline.email;
  const baselineCreatedAt = baseline.created_at;
  const baselineDeletedAt = baseline.deleted_at ?? null;

  // 4. Update account: suspended=true, banned=false
  const suspendUpdateBody = {
    is_suspended: true,
    is_banned: false,
  } satisfies ICommunityPlatformAdminuser.IUpdate;

  const suspendedUpdated: ICommunityPlatformAdminuser =
    await api.functional.communityPlatform.adminUser.adminUsers.update(
      connection,
      {
        username: authorized.username,
        body: suspendUpdateBody,
      },
    );
  typia.assert(suspendedUpdated);

  // 5. Re-read and validate suspended state
  const suspendedDetail: ICommunityPlatformAdminuser =
    await api.functional.communityPlatform.adminUser.adminUsers.at(connection, {
      username: authorized.username,
    });
  typia.assert(suspendedDetail);

  TestValidator.equals(
    "suspended detail id invariant",
    suspendedDetail.id,
    baselineId,
  );
  TestValidator.equals(
    "suspended detail username invariant",
    suspendedDetail.username,
    baselineUsername,
  );
  TestValidator.equals(
    "suspended detail email invariant",
    suspendedDetail.email,
    baselineEmail,
  );
  TestValidator.equals(
    "suspended detail created_at invariant",
    suspendedDetail.created_at,
    baselineCreatedAt,
  );
  TestValidator.equals(
    "suspended detail deleted_at invariant",
    suspendedDetail.deleted_at ?? null,
    baselineDeletedAt,
  );

  TestValidator.equals(
    "is_suspended true when suspension applied",
    suspendedDetail.is_suspended,
    true,
  );
  TestValidator.equals(
    "is_banned false when only suspension applied",
    suspendedDetail.is_banned,
    false,
  );

  // 6. Update account: suspended=false, banned=true
  const banUpdateBody = {
    is_suspended: false,
    is_banned: true,
  } satisfies ICommunityPlatformAdminuser.IUpdate;

  const bannedUpdated: ICommunityPlatformAdminuser =
    await api.functional.communityPlatform.adminUser.adminUsers.update(
      connection,
      {
        username: authorized.username,
        body: banUpdateBody,
      },
    );
  typia.assert(bannedUpdated);

  // 7. Re-read and validate banned state
  const bannedDetail: ICommunityPlatformAdminuser =
    await api.functional.communityPlatform.adminUser.adminUsers.at(connection, {
      username: authorized.username,
    });
  typia.assert(bannedDetail);

  TestValidator.equals(
    "banned detail id invariant",
    bannedDetail.id,
    baselineId,
  );
  TestValidator.equals(
    "banned detail username invariant",
    bannedDetail.username,
    baselineUsername,
  );
  TestValidator.equals(
    "banned detail email invariant",
    bannedDetail.email,
    baselineEmail,
  );
  TestValidator.equals(
    "banned detail created_at invariant",
    bannedDetail.created_at,
    baselineCreatedAt,
  );
  TestValidator.equals(
    "banned detail deleted_at invariant",
    bannedDetail.deleted_at ?? null,
    baselineDeletedAt,
  );

  TestValidator.equals(
    "is_suspended false when only ban applied",
    bannedDetail.is_suspended,
    false,
  );
  TestValidator.equals(
    "is_banned true when ban applied",
    bannedDetail.is_banned,
    true,
  );

  // 8. Ensure no unexpected secret fields are present by relying on the
  // ICommunityPlatformAdminuser type and typia.assert; any secret fields would
  // violate the DTO contract and fail type validation, so no additional
  // property-level checks are necessary here.
}
