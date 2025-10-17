import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformKarmaLedger } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformKarmaLedger";

/**
 * Validate karma ledger creation for a new member (global scope), uniqueness
 * enforcement, and correct initial state.
 *
 * 1. Register a new platform admin via /auth/admin/join
 * 2. As admin, create a new global karma ledger entry for a random (simulated)
 *    member ID
 * 3. Validate returned ledger fields match input and DTO expectations
 * 4. Attempt to re-create global ledger for the same member, expect error
 */
export async function test_api_karma_ledger_creation_for_new_member_global_scope(
  connection: api.IConnection,
) {
  // 1. Register admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphabets(10);
  const admin: ICommunityPlatformAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
      } satisfies ICommunityPlatformAdmin.ICreate,
    });
  typia.assert(admin);
  TestValidator.equals(
    "registered admin email matches",
    admin.email,
    adminEmail,
  );
  TestValidator.predicate("admin status is active", admin.status === "active");

  // 2. Prepare member UUID for whom ledger will be created (simulate member)
  const memberId = typia.random<string & tags.Format<"uuid">>();
  const initialKarma = 0;

  // 3. Create new global karma ledger (community_platform_community_id: null) for this member
  const createBody = {
    community_platform_member_id: memberId,
    community_platform_community_id: null,
    current_karma: initialKarma,
    feature_lock_reason: null,
  } satisfies ICommunityPlatformKarmaLedger.ICreate;
  const ledger: ICommunityPlatformKarmaLedger =
    await api.functional.communityPlatform.admin.karmaLedgers.create(
      connection,
      { body: createBody },
    );
  typia.assert(ledger);
  TestValidator.equals(
    "ledger member ID matches",
    ledger.community_platform_member_id,
    memberId,
  );
  TestValidator.equals(
    "ledger scope is global (null community id)",
    ledger.community_platform_community_id,
    null,
  );
  TestValidator.equals(
    "ledger initial karma matches input",
    ledger.current_karma,
    initialKarma,
  );
  TestValidator.equals(
    "ledger feature lock reason is null",
    ledger.feature_lock_reason,
    null,
  );
  TestValidator.predicate(
    "ledger created_at and updated_at are present",
    typeof ledger.created_at === "string" &&
      typeof ledger.updated_at === "string",
  );

  // 4. Try creating duplicate global ledger for same member, expect business error
  await TestValidator.error(
    "cannot create duplicate global karma ledger for same member",
    async () => {
      await api.functional.communityPlatform.admin.karmaLedgers.create(
        connection,
        { body: createBody },
      );
    },
  );
}
