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

export async function test_api_user_ban_update_status_active_to_revoked(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as super administrator
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_login(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
      href: "http://localhost:3000",
      referrer: "http://localhost:3000",
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardSuperAdmin.ILogin,
  });
  // 2. Create a user account to be banned (via admin authentication)
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
      display_name: RandomGenerator.name(),
      href: "http://localhost:3000",
      referrer: "http://localhost:3000",
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  // 3. Create an active ban record using admin endpoint
  const activeBan =
    await generate_random_discussion_board_admin_user_bans_create(
      adminConnection,
      {
        body: {
          bannedUserId: typia.random<string & tags.Format<"uuid">>(),
          banReason: RandomGenerator.paragraph({
            sentences: 3,
            wordMin: 4,
            wordMax: 8,
          }),
          banDurationType: "temporary",
          banDurationDays: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<30>
          >(),
        } satisfies IDiscussionBoardBanRecord.ICreate,
      },
    );
  typia.assert(activeBan);
  // 4. Validate initial ban status is active
  TestValidator.equals(
    "initial ban status should be active",
    activeBan.banStatus,
    "active",
  );
  TestValidator.predicate(
    "revokedAt should be null initially",
    activeBan.revokedAt === null,
  );
  TestValidator.predicate(
    "revocationReason should be null initially",
    activeBan.revocationReason === null,
  );
  // 5. Update ban status to revoked using super admin endpoint
  const updateResponse =
    await api.functional.discussionBoard.superAdmin.user_bans.update(
      superAdminConnection,
      {
        banId: activeBan.id,
        body: {
          banStatus: "revoked",
          revocationReason: RandomGenerator.paragraph({
            sentences: 2,
            wordMin: 3,
            wordMax: 6,
          }),
        } satisfies IDiscussionBoardBanRecord.IUpdate,
      },
    );
  typia.assert(updateResponse);
  // 6. Validate the updated ban record
  TestValidator.equals(
    "ban status should be updated to revoked",
    updateResponse.banStatus,
    "revoked",
  );
  TestValidator.predicate(
    "revokedAt should be set",
    updateResponse.revokedAt !== null,
  );
  TestValidator.predicate(
    "revocationReason should be set",
    updateResponse.revocationReason !== null,
  );
  TestValidator.equals(
    "ban id should remain the same",
    updateResponse.id,
    activeBan.id,
  );
  TestValidator.equals(
    "banned user should remain the same",
    updateResponse.bannedUser.id,
    activeBan.bannedUser.id,
  );
  TestValidator.equals(
    "ban reason should remain unchanged",
    updateResponse.banReason,
    activeBan.banReason,
  );
  TestValidator.equals(
    "ban duration type should remain unchanged",
    updateResponse.banDurationType,
    activeBan.banDurationType,
  );
  // 7. Validate timestamp updates
  TestValidator.predicate(
    "updatedAt should be newer than createdAt",
    new Date(updateResponse.updatedAt) > new Date(updateResponse.createdAt),
  );
}
