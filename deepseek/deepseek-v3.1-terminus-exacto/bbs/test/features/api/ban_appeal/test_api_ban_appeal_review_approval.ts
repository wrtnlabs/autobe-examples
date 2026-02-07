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

export async function test_api_ban_appeal_review_approval(
  connection: api.IConnection,
): Promise<void> {
  // Create super admin connection and authenticate
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdmin = await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      privilege_level: "super_admin",
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  // Create user connection and authenticate
  const userConnection: api.IConnection = { host: connection.host };
  const user = await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
    } satisfies IDiscussionBoardUser.IJoin,
  });
  // Create a ban record
  const banRecord =
    await generate_random_discussion_board_super_admin_ban_records_create(
      superAdminConnection,
      {
        body: {
          ban_reason: RandomGenerator.paragraph({ sentences: 1 }),
          ban_duration_days: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1>
          >(),
          ban_status: "active",
        } satisfies IDiscussionBoardBanRecord.ICreate,
      },
    );
  typia.assert(banRecord);
  // User submits an appeal
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
  // Verify initial appeal status is pending
  TestValidator.equals(
    "appeal status should be pending initially",
    appeal.status,
    "pending",
  );
  TestValidator.equals(
    "decision reason should be null initially",
    appeal.decision_reason,
    null,
  );
  TestValidator.equals(
    "reviewer should be null initially",
    appeal.reviewer,
    null,
  );
  TestValidator.equals(
    "reviewed_at should be null initially",
    appeal.reviewed_at,
    null,
  );
  // Super admin reviews and approves the appeal
  const decisionReason = RandomGenerator.paragraph({ sentences: 2 });
  const updatedAppeal =
    await api.functional.discussionBoard.superAdmin.ban_records.appeals.patchByBanrecordid(
      superAdminConnection,
      {
        banRecordId: banRecord.id,
        body: {
          status: "approved",
          decision_reason: decisionReason,
        } satisfies IDiscussionBoardBanAppeal.IUpdate,
      },
    );
  typia.assert(updatedAppeal);
  // Validate appeal was properly updated
  TestValidator.equals(
    "appeal status should be approved",
    updatedAppeal.status,
    "approved",
  );
  TestValidator.equals(
    "decision reason should match",
    updatedAppeal.decision_reason,
    decisionReason,
  );
  TestValidator.predicate(
    "reviewer should be set",
    updatedAppeal.reviewer !== null,
  );
  TestValidator.predicate(
    "reviewed_at should be set",
    updatedAppeal.reviewed_at !== null,
  );
  // Verify reviewer information is properly populated
  if (updatedAppeal.reviewer) {
    TestValidator.predicate(
      "reviewer should have id",
      updatedAppeal.reviewer.id !== undefined,
    );
    TestValidator.predicate(
      "reviewer should have email",
      updatedAppeal.reviewer.email !== undefined,
    );
    TestValidator.predicate(
      "reviewer should have display_name",
      updatedAppeal.reviewer.display_name !== undefined,
    );
    TestValidator.predicate(
      "reviewer should have created_at",
      updatedAppeal.reviewer.created_at !== undefined,
    );
  }
  // The ban record status should be updated to reflect the appeal decision
  // This would typically involve checking the ban record's status field
  // Since we don't have a GET endpoint for ban records, we validate through the appeal's banRecord field
  TestValidator.predicate(
    "ban record should be accessible through appeal",
    updatedAppeal.banRecord !== undefined,
  );
  TestValidator.equals(
    "ban record id should match",
    updatedAppeal.banRecord.id,
    banRecord.id,
  );
}
