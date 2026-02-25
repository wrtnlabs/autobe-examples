import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardBanRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardBanRecord";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";
import { generate_random_discussion_board_admin_user_bans_create } from "../../../generate/generate_random_discussion_board_admin_user_bans_create";
import { prepare_random_discussion_board_ban_record } from "../../../prepare/prepare_random_discussion_board_ban_record";

export async function test_api_user_ban_update_comprehensive_fields(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as super administrator (primary actor for ban updates)
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdminEmail = typia.random<string & tags.Format<"email">>();
  const superAdminPassword = RandomGenerator.alphaNumeric(16);
  await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: superAdminEmail,
      password: superAdminPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  // 2. Create regular administrator account (to act as banning administrator)
  const adminConnection: api.IConnection = { host: connection.host };
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(16);
  const adminDisplayName = RandomGenerator.name();
  await authorize_admin_join(adminConnection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      display_name: adminDisplayName,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  // 3. Create an initial temporary ban record via regular admin
  // First, login regular admin to get proper auth header
  const adminLoginConnection: api.IConnection = { host: connection.host };
  await authorize_admin_login(adminLoginConnection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardAdmin.ILogin,
  });
  // Generate a random user ID to be banned (simulating existing user)
  const bannedUserId = typia.random<string & tags.Format<"uuid">>();
  const banDurationDays = typia.random<
    number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<30>
  >();
  // Create the initial ban record
  const initialBan =
    await generate_random_discussion_board_admin_user_bans_create(
      adminLoginConnection,
      {
        body: {
          bannedUserId,
          banReason: RandomGenerator.paragraph({ sentences: 2 }),
          banDurationType: "temporary" as const,
          banDurationDays,
        } satisfies IDiscussionBoardBanRecord.ICreate,
      },
    );
  typia.assert(initialBan);
  // 4. Login super administrator for ban updates
  const superAdminLoginConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_login(superAdminLoginConnection, {
    body: {
      email: superAdminEmail,
      password: superAdminPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardSuperAdmin.ILogin,
  });
  // 5. Test 1: Update appeal status to pending with reason
  const appealReason = RandomGenerator.paragraph({ sentences: 1 });
  const updatedAppeal =
    await api.functional.discussionBoard.superAdmin.user_bans.update(
      superAdminLoginConnection,
      {
        banId: initialBan.id,
        body: {
          appealStatus: "pending",
          appealReason,
        } satisfies IDiscussionBoardBanRecord.IUpdate,
      },
    );
  typia.assert(updatedAppeal);
  TestValidator.equals(
    "appeal status updated",
    updatedAppeal.appealStatus,
    "pending",
  );
  TestValidator.equals(
    "appeal reason stored",
    updatedAppeal.appealReason,
    appealReason,
  );
  TestValidator.notEquals(
    "updated_at changed",
    updatedAppeal.updatedAt,
    initialBan.updatedAt,
  );
  // 6. Test 2: Update appeal decision after review
  const appealDecisionReason = RandomGenerator.paragraph({ sentences: 1 });
  const updatedDecision =
    await api.functional.discussionBoard.superAdmin.user_bans.update(
      superAdminLoginConnection,
      {
        banId: initialBan.id,
        body: {
          appealStatus: "approved",
          appealDecisionReason,
        } satisfies IDiscussionBoardBanRecord.IUpdate,
      },
    );
  typia.assert(updatedDecision);
  TestValidator.equals(
    "appeal status approved",
    updatedDecision.appealStatus,
    "approved",
  );
  TestValidator.equals(
    "decision reason stored",
    updatedDecision.appealDecisionReason,
    appealDecisionReason,
  );
  TestValidator.equals(
    "appeal reason preserved",
    updatedDecision.appealReason,
    appealReason,
  );
  TestValidator.notEquals(
    "second update timestamp",
    updatedDecision.updatedAt,
    updatedAppeal.updatedAt,
  );
  // 7. Test 3: Update ban status to revoked with revocation reason
  const revocationReason = RandomGenerator.paragraph({ sentences: 1 });
  const revocationTime = new Date().toISOString();
  const updatedRevocation =
    await api.functional.discussionBoard.superAdmin.user_bans.update(
      superAdminLoginConnection,
      {
        banId: initialBan.id,
        body: {
          banStatus: "revoked",
          revokedAt: revocationTime,
          revocationReason,
        } satisfies IDiscussionBoardBanRecord.IUpdate,
      },
    );
  typia.assert(updatedRevocation);
  TestValidator.equals(
    "ban status revoked",
    updatedRevocation.banStatus,
    "revoked",
  );
  TestValidator.equals(
    "revocation time set",
    updatedRevocation.revokedAt,
    revocationTime,
  );
  TestValidator.equals(
    "revocation reason stored",
    updatedRevocation.revocationReason,
    revocationReason,
  );
  TestValidator.equals(
    "appeal status preserved",
    updatedRevocation.appealStatus,
    "approved",
  );
  TestValidator.equals(
    "decision reason preserved",
    updatedRevocation.appealDecisionReason,
    appealDecisionReason,
  );
  // 8. Test 4: Full update with multiple fields simultaneously
  const fullUpdate =
    await api.functional.discussionBoard.superAdmin.user_bans.update(
      superAdminLoginConnection,
      {
        banId: initialBan.id,
        body: {
          banStatus: "active",
          appealStatus: "rejected",
          appealReason: null,
          appealDecisionReason: "New decision after review",
          revokedAt: null,
          revocationReason: null,
        } satisfies IDiscussionBoardBanRecord.IUpdate,
      },
    );
  typia.assert(fullUpdate);
  TestValidator.equals(
    "ban status reactivated",
    fullUpdate.banStatus,
    "active",
  );
  TestValidator.equals(
    "appeal status rejected",
    fullUpdate.appealStatus,
    "rejected",
  );
  TestValidator.equals("appeal reason cleared", fullUpdate.appealReason, null);
  TestValidator.equals(
    "appeal decision updated",
    fullUpdate.appealDecisionReason,
    "New decision after review",
  );
  TestValidator.equals("revocation cleared", fullUpdate.revokedAt, null);
  TestValidator.equals(
    "revocation reason cleared",
    fullUpdate.revocationReason,
    null,
  );
  // 9. Validate that immutable relationships remain unchanged through all updates
  TestValidator.equals(
    "banned user unchanged",
    fullUpdate.bannedUser.id,
    bannedUserId,
  );
  // Fix: Remove the invalid property access - the banning administrator ID should come from the ban record itself
  TestValidator.equals(
    "banning admin unchanged",
    fullUpdate.banningAdministrator.id,
    initialBan.banningAdministrator.id,
  );
  TestValidator.equals(
    "ban reason preserved",
    fullUpdate.banReason,
    initialBan.banReason,
  );
  TestValidator.equals(
    "ban duration type preserved",
    fullUpdate.banDurationType,
    "temporary",
  );
  TestValidator.equals(
    "ban duration days preserved",
    fullUpdate.banDurationDays,
    banDurationDays,
  );
  TestValidator.equals(
    "ban started at preserved",
    fullUpdate.banStartedAt,
    initialBan.banStartedAt,
  );
}