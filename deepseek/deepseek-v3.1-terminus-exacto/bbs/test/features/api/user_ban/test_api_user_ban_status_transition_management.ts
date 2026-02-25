import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardBanRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardBanRecord";
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
import { generate_random_discussion_board_admin_user_bans_create } from "../../../generate/generate_random_discussion_board_admin_user_bans_create";
import { prepare_random_discussion_board_ban_record } from "../../../prepare/prepare_random_discussion_board_ban_record";

/**
 * Test administrator ban status transition workflow.
 * 1. Admin authenticates and creates temporary ban
 * 2. Test status transition from 'active' to 'expired'
 * 3. Validate timestamp updates and logical workflow compliance
 */
export async function test_api_user_ban_status_transition_management(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin authentication using utility function
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  typia.assert(admin);
  // 2. Create test user for banning (mock user creation)
  const testUserId = typia.random<string & tags.Format<"uuid">>();
  // 3. Create temporary ban using utility function
  const banRecord =
    await generate_random_discussion_board_admin_user_bans_create(
      adminConnection,
      {
        body: {
          bannedUserId: testUserId,
          banReason: RandomGenerator.paragraph({
            sentences: 2,
          }) satisfies string & tags.MinLength<10>,
          banDurationType: "temporary" as const,
          banDurationDays: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<7>
          >(),
        } satisfies IDiscussionBoardBanRecord.ICreate,
      },
    );
  typia.assert(banRecord);
  // 4. Verify initial ban status is 'active'
  TestValidator.equals(
    "initial ban status should be active",
    banRecord.banStatus,
    "active",
  );
  // 5. Test status transition from 'active' to 'expired'
  const updatedBan =
    await api.functional.discussionBoard.admin.user_bans.update(
      adminConnection,
      {
        banId: banRecord.id,
        body: {
          banStatus: "expired",
        } satisfies IDiscussionBoardBanRecord.IUpdate,
      },
    );
  typia.assert(updatedBan);
  // 6. Validate expired status and audit trail
  TestValidator.equals(
    "ban status should be expired",
    updatedBan.banStatus,
    "expired",
  );
  TestValidator.notEquals(
    "updated timestamp should change",
    banRecord.updatedAt,
    updatedBan.updatedAt,
  );
  TestValidator.predicate(
    "expired status transition is valid",
    banRecord.banStatus === "active" && updatedBan.banStatus === "expired",
  );
  // 7. Optional: Test additional status transitions if supported
  // This could include 'revoked' status if the business logic allows it
  // 8. Validate comprehensive audit trail preservation
  TestValidator.equals(
    "banned user should remain the same",
    updatedBan.bannedUser.id,
    testUserId,
  );
  TestValidator.equals(
    "banning admin should remain the same",
    updatedBan.banningAdministrator.id,
    admin.id,
  );
  TestValidator.equals(
    "ban reason should be preserved",
    updatedBan.banReason,
    banRecord.banReason,
  );
}
