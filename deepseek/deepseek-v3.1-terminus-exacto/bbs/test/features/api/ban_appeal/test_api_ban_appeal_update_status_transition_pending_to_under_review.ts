import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardBanAppeal } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardBanAppeal";
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
import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";
import { generate_random_discussion_board_admin_ban_records_create } from "../../../generate/generate_random_discussion_board_admin_ban_records_create";
import { generate_random_discussion_board_user_ban_records_appeals_create } from "../../../generate/generate_random_discussion_board_user_ban_records_appeals_create";
import { prepare_random_discussion_board_ban_appeal } from "../../../prepare/prepare_random_discussion_board_ban_appeal";
import { prepare_random_discussion_board_ban_record } from "../../../prepare/prepare_random_discussion_board_ban_record";

export async function test_api_ban_appeal_update_status_transition_pending_to_under_review(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  const authorizedAdmin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  // Update admin connection with authentication token
  adminConnection.headers = { Authorization: authorizedAdmin.token.access };
  // 2. Create a ban record
  const banRecord =
    await generate_random_discussion_board_admin_ban_records_create(
      adminConnection,
      {
        body: {
          ban_reason: RandomGenerator.paragraph({ sentences: 2 }),
          ban_duration_days: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<30>
          >(),
          ban_status: "active" as const,
        } satisfies IDiscussionBoardBanRecord.ICreate,
      },
    );
  typia.assert(banRecord);
  // 3. Create and authenticate as regular user
  const userConnection: api.IConnection = { host: connection.host };
  const authorizedUser = await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
    } satisfies IDiscussionBoardUser.IJoin,
  });
  // Update user connection with authentication token
  userConnection.headers = { Authorization: authorizedUser.token.access };
  // 4. User submits appeal against the ban record
  const appeal =
    await generate_random_discussion_board_user_ban_records_appeals_create(
      userConnection,
      {
        body: {
          appeal_reason: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IDiscussionBoardBanAppeal.ICreate,
        params: {
          banRecordId: banRecord.id,
        },
      },
    );
  typia.assert(appeal);
  // Validate initial appeal state
  TestValidator.equals(
    "initial appeal status should be pending",
    appeal.status,
    "pending",
  );
  TestValidator.equals(
    "initial decision_reason should be null",
    appeal.decision_reason,
    null,
  );
  TestValidator.equals(
    "initial reviewed_at should be null",
    appeal.reviewed_at,
    null,
  );
  TestValidator.equals(
    "initial reviewer should be null",
    appeal.reviewer,
    null,
  );
  // 5. Administrator updates appeal status to 'under_review'
  const updatedAppeal =
    await api.functional.discussionBoard.admin.ban_records.appeals.putByBanrecordidAndAppealid(
      adminConnection,
      {
        banRecordId: banRecord.id,
        appealId: appeal.id,
        body: {
          status: "under_review" as const,
          decision_reason: null,
        } satisfies IDiscussionBoardBanAppeal.IUpdate,
      },
    );
  typia.assert(updatedAppeal);
  // 6. Validate status transition and intermediate state properties
  TestValidator.equals(
    "appeal status should be updated to under_review",
    updatedAppeal.status,
    "under_review",
  );
  TestValidator.equals(
    "decision_reason should remain null during intermediate review",
    updatedAppeal.decision_reason,
    null,
  );
  TestValidator.notEquals(
    "reviewed_at should be set",
    updatedAppeal.reviewed_at,
    null,
  );
  TestValidator.notEquals(
    "reviewer should be set",
    updatedAppeal.reviewer,
    null,
  );
  TestValidator.equals(
    "ban record should remain unchanged",
    updatedAppeal.banRecord.id,
    banRecord.id,
  );
  TestValidator.equals(
    "user should remain unchanged",
    updatedAppeal.user.id,
    appeal.user.id,
  );
  TestValidator.equals(
    "appeal reason should remain unchanged",
    updatedAppeal.appeal_reason,
    appeal.appeal_reason,
  );
  TestValidator.notEquals(
    "updated_at should change after status update",
    updatedAppeal.updated_at,
    appeal.updated_at,
  );
  TestValidator.predicate(
    "reviewer should be the administrator who performed the update",
    updatedAppeal.reviewer !== null &&
      updatedAppeal.reviewer.id === authorizedAdmin.id,
  );
}
