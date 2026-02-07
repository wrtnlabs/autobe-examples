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

export async function test_api_ban_appeal_approval_with_decision_reason(
  connection: api.IConnection,
): Promise<void> {
  // Create super administrator connection
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdmin = await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      privilege_level: "super_admin",
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  // Create ban record using super admin
  const banRecord =
    await generate_random_discussion_board_super_admin_ban_records_create(
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
  // Create user connection
  const userConnection: api.IConnection = { host: connection.host };
  await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
    } satisfies IDiscussionBoardUser.IJoin,
  });
  // User submits appeal
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
  // Verify initial appeal status is 'pending'
  TestValidator.equals("initial appeal status", appeal.status, "pending");
  TestValidator.equals(
    "initial decision reason null",
    appeal.decision_reason,
    null,
  );
  TestValidator.equals("initial reviewed at null", appeal.reviewed_at, null);
  TestValidator.equals("initial reviewer null", appeal.reviewer, null);
  // Super admin approves appeal with decision reason
  const decisionReason = RandomGenerator.paragraph({ sentences: 4 });
  const updatedAppeal =
    await api.functional.discussionBoard.superAdmin.ban_records.appeals.putByBanrecordidAndAppealid(
      superAdminConnection,
      {
        banRecordId: banRecord.id,
        appealId: appeal.id,
        body: {
          status: "approved",
          decision_reason: decisionReason,
        } satisfies IDiscussionBoardBanAppeal.IUpdate,
      },
    );
  typia.assert(updatedAppeal);
  // Verify appeal status transition
  TestValidator.equals(
    "appeal status approved",
    updatedAppeal.status,
    "approved",
  );
  TestValidator.equals(
    "decision reason stored",
    updatedAppeal.decision_reason,
    decisionReason,
  );
  TestValidator.notEquals(
    "reviewed at timestamp set",
    updatedAppeal.reviewed_at,
    null,
  );
  TestValidator.notEquals(
    "reviewer information recorded",
    updatedAppeal.reviewer,
    null,
  );
  // Verify reviewed_at is valid date-time format
  TestValidator.predicate(
    "reviewed_at is valid date-time",
    updatedAppeal.reviewed_at !== null &&
      typeof updatedAppeal.reviewed_at === "string" &&
      updatedAppeal.reviewed_at.includes("T"),
  );
  // Verify reviewer information matches super admin
  TestValidator.equals(
    "reviewer ID matches super admin",
    updatedAppeal.reviewer!.id,
    superAdmin.id,
  );
  TestValidator.equals(
    "reviewer email matches super admin",
    updatedAppeal.reviewer!.email,
    superAdmin.email,
  );
  // Verify ban record remains accessible
  TestValidator.equals(
    "ban record ID matches",
    updatedAppeal.banRecord.id,
    banRecord.id,
  );
  TestValidator.equals(
    "ban record reason unchanged",
    updatedAppeal.banRecord.ban_reason,
    banRecord.ban_reason,
  );
  // Verify reviewer has complete information
  TestValidator.predicate(
    "reviewer has display name",
    updatedAppeal.reviewer!.display_name.length > 0,
  );
  TestValidator.predicate(
    "reviewer has creation timestamp",
    updatedAppeal.reviewer!.created_at.length > 0,
  );
}
