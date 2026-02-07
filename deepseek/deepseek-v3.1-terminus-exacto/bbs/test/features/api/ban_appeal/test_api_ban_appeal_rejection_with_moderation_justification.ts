import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardBanAppeal } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardBanAppeal";
import type { IDiscussionBoardBanRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardBanRecord";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";
import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";
import { generate_random_discussion_board_super_admin_ban_records_create } from "../../../generate/generate_random_discussion_board_super_admin_ban_records_create";
import { generate_random_discussion_board_user_ban_records_appeals_create } from "../../../generate/generate_random_discussion_board_user_ban_records_appeals_create";
import { prepare_random_discussion_board_ban_appeal } from "../../../prepare/prepare_random_discussion_board_ban_appeal";
import { prepare_random_discussion_board_ban_record } from "../../../prepare/prepare_random_discussion_board_ban_record";

export async function test_api_ban_appeal_rejection_with_moderation_justification(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate super administrator
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_login(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    } satisfies IDiscussionBoardSuperAdmin.ILogin,
  });
  // 2. Create an active ban record
  const banRecord =
    await api.functional.discussionBoard.superAdmin.ban_records.create(
      superAdminConnection,
      {
        body: {
          ban_reason: RandomGenerator.paragraph({ sentences: 2 }),
          ban_duration_days: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<30>
          >(),
          ban_status: "active",
        } satisfies IDiscussionBoardBanRecord.ICreate,
      },
    );
  typia.assert(banRecord);
  // 3. Create and authenticate regular user
  const userConnection: api.IConnection = { host: connection.host };
  await authorize_user_login(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IDiscussionBoardUser.ILogin,
  });
  // 4. User submits appeal against the ban
  const appeal =
    await api.functional.discussionBoard.user.ban_records.appeals.create(
      userConnection,
      {
        banRecordId: banRecord.id,
        body: {
          appeal_reason: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IDiscussionBoardBanAppeal.ICreate,
      },
    );
  typia.assert(appeal);
  // 5. Super administrator reviews and rejects the appeal with justification
  const moderationJustification = RandomGenerator.paragraph({ sentences: 4 });
  const rejectedAppeal =
    await api.functional.discussionBoard.superAdmin.ban_records.appeals.putByBanrecordidAndAppealid(
      superAdminConnection,
      {
        banRecordId: banRecord.id,
        appealId: appeal.id,
        body: {
          status: "rejected",
          decision_reason: moderationJustification,
        } satisfies IDiscussionBoardBanAppeal.IUpdate,
      },
    );
  typia.assert(rejectedAppeal);
  // 6. Validate the rejection workflow
  TestValidator.equals(
    "appeal status should be rejected",
    rejectedAppeal.status,
    "rejected",
  );
  TestValidator.equals(
    "decision reason should match moderation justification",
    rejectedAppeal.decision_reason,
    moderationJustification,
  );
  TestValidator.predicate(
    "reviewer should be attributed",
    rejectedAppeal.reviewer !== null,
  );
  TestValidator.predicate(
    "reviewed timestamp should be set",
    rejectedAppeal.reviewed_at !== null,
  );
  TestValidator.equals(
    "ban record should remain active",
    rejectedAppeal.banRecord.ban_status,
    "active",
  );
  TestValidator.equals(
    "ban record should not be revoked",
    rejectedAppeal.banRecord.revoked_at,
    null,
  );
}
