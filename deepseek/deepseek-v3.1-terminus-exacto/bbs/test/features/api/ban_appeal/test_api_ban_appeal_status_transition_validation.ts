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
import { generate_random_discussion_board_admin_ban_records_create } from "../../../generate/generate_random_discussion_board_admin_ban_records_create";
import { generate_random_discussion_board_bans_appeals_create } from "../../../generate/generate_random_discussion_board_bans_appeals_create";
import { prepare_random_discussion_board_ban_appeal } from "../../../prepare/prepare_random_discussion_board_ban_appeal";
import { prepare_random_discussion_board_ban_record } from "../../../prepare/prepare_random_discussion_board_ban_record";

export async function test_api_ban_appeal_status_transition_validation(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  // Test 1: Valid status transition workflow
  // Create a ban record
  const banRecord1 =
    await generate_random_discussion_board_admin_ban_records_create(
      adminConnection,
      {
        body: {
          ban_reason: RandomGenerator.paragraph({ sentences: 2 }),
          ban_duration_days: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1>
          >(),
          ban_status: "active",
        } satisfies IDiscussionBoardBanRecord.ICreate,
      },
    );
  typia.assert(banRecord1);
  // Create a user connection and submit an appeal
  const userConnection: api.IConnection = { host: connection.host };
  const appeal1 = await generate_random_discussion_board_bans_appeals_create(
    userConnection,
    {
      body: {
        appeal_reason: RandomGenerator.paragraph({ sentences: 3 }),
      } satisfies IDiscussionBoardBanAppeal.ICreate,
      params: {
        banId: banRecord1.id,
      },
    },
  );
  typia.assert(appeal1);
  // Test valid status update with only status field (partial update)
  const updatedAppeal1 =
    await api.functional.discussionBoard.admin.ban_records.appeals.patchByBanrecordid(
      adminConnection,
      {
        banRecordId: banRecord1.id,
        body: {
          status: "reviewed",
        } satisfies IDiscussionBoardBanAppeal.IUpdate,
      },
    );
  typia.assert(updatedAppeal1);
  TestValidator.equals(
    "status should be updated",
    updatedAppeal1.status,
    "reviewed",
  );
  TestValidator.predicate(
    "reviewer should be populated",
    updatedAppeal1.reviewer !== null,
  );
  TestValidator.predicate(
    "reviewed_at should be populated",
    updatedAppeal1.reviewed_at !== null,
  );
  // Test 2: Status update with decision_reason
  const banRecord2 =
    await generate_random_discussion_board_admin_ban_records_create(
      adminConnection,
      {
        body: {
          ban_reason: RandomGenerator.paragraph({ sentences: 2 }),
          ban_duration_days: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1>
          >(),
          ban_status: "active",
        } satisfies IDiscussionBoardBanRecord.ICreate,
      },
    );
  typia.assert(banRecord2);
  const appeal2 = await generate_random_discussion_board_bans_appeals_create(
    userConnection,
    {
      body: {
        appeal_reason: RandomGenerator.paragraph({ sentences: 3 }),
      } satisfies IDiscussionBoardBanAppeal.ICreate,
      params: {
        banId: banRecord2.id,
      },
    },
  );
  typia.assert(appeal2);
  const updatedAppeal2 =
    await api.functional.discussionBoard.admin.ban_records.appeals.patchByBanrecordid(
      adminConnection,
      {
        banRecordId: banRecord2.id,
        body: {
          status: "approved",
          decision_reason: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IDiscussionBoardBanAppeal.IUpdate,
      },
    );
  typia.assert(updatedAppeal2);
  TestValidator.equals(
    "status should be approved",
    updatedAppeal2.status,
    "approved",
  );
  TestValidator.predicate(
    "decision_reason should be set",
    updatedAppeal2.decision_reason !== null,
  );
  // Test 3: Partial update maintaining existing values
  const banRecord3 =
    await generate_random_discussion_board_admin_ban_records_create(
      adminConnection,
      {
        body: {
          ban_reason: RandomGenerator.paragraph({ sentences: 2 }),
          ban_duration_days: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1>
          >(),
          ban_status: "active",
        } satisfies IDiscussionBoardBanRecord.ICreate,
      },
    );
  typia.assert(banRecord3);
  const appeal3 = await generate_random_discussion_board_bans_appeals_create(
    userConnection,
    {
      body: {
        appeal_reason: RandomGenerator.paragraph({ sentences: 3 }),
      } satisfies IDiscussionBoardBanAppeal.ICreate,
      params: {
        banId: banRecord3.id,
      },
    },
  );
  typia.assert(appeal3);
  // First update with status
  const firstUpdate =
    await api.functional.discussionBoard.admin.ban_records.appeals.patchByBanrecordid(
      adminConnection,
      {
        banRecordId: banRecord3.id,
        body: {
          status: "reviewed",
        } satisfies IDiscussionBoardBanAppeal.IUpdate,
      },
    );
  typia.assert(firstUpdate);
  // Second update with only decision_reason (should maintain status)
  const secondUpdate =
    await api.functional.discussionBoard.admin.ban_records.appeals.patchByBanrecordid(
      adminConnection,
      {
        banRecordId: banRecord3.id,
        body: {
          decision_reason: "Additional decision details",
        } satisfies IDiscussionBoardBanAppeal.IUpdate,
      },
    );
  typia.assert(secondUpdate);
  TestValidator.equals(
    "status should be maintained",
    secondUpdate.status,
    "reviewed",
  );
  TestValidator.equals(
    "decision_reason should be updated",
    secondUpdate.decision_reason,
    "Additional decision details",
  );
  // Test 4: Verify reviewer information is automatically populated
  TestValidator.predicate(
    "reviewer should be an admin",
    secondUpdate.reviewer !== null,
  );
  TestValidator.predicate(
    "reviewer should have id",
    secondUpdate.reviewer!.id !== undefined,
  );
  TestValidator.predicate(
    "reviewer should have email",
    secondUpdate.reviewer!.email !== undefined,
  );
  TestValidator.predicate(
    "reviewer should have display_name",
    secondUpdate.reviewer!.display_name !== undefined,
  );
}
