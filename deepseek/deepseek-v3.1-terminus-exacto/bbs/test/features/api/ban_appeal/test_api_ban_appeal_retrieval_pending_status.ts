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

export async function test_api_ban_appeal_retrieval_pending_status(
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
  // Create user connection and store user info
  const userConnection: api.IConnection = { host: connection.host };
  const userJoinResult = await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
    } satisfies IDiscussionBoardUser.IJoin,
  });
  const userId = userJoinResult.id;
  // Create ban record as admin
  const banRecord =
    await generate_random_discussion_board_admin_ban_records_create(
      adminConnection,
      {
        body: {
          ban_reason: RandomGenerator.paragraph({ sentences: 3 }),
          ban_duration_days: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1>
          >(),
          ban_status: "active" as const,
        } satisfies IDiscussionBoardBanRecord.ICreate,
      },
    );
  typia.assert(banRecord);
  // Create ban appeal as user
  const banAppeal =
    await generate_random_discussion_board_user_ban_records_appeals_create(
      userConnection,
      {
        body: {
          appeal_reason: RandomGenerator.paragraph({ sentences: 4 }),
        } satisfies IDiscussionBoardBanAppeal.ICreate,
        params: {
          banRecordId: banRecord.id,
        },
      },
    );
  typia.assert(banAppeal);
  // Retrieve the ban appeal as admin
  const retrievedAppeal =
    await api.functional.discussionBoard.admin.ban_records.appeals.at(
      adminConnection,
      {
        banRecordId: banRecord.id,
        appealId: banAppeal.id,
      },
    );
  typia.assert(retrievedAppeal);
  // Validate appeal details
  TestValidator.equals("appeal ID matches", retrievedAppeal.id, banAppeal.id);
  TestValidator.equals(
    "appeal reason matches",
    retrievedAppeal.appeal_reason,
    banAppeal.appeal_reason,
  );
  TestValidator.equals("status is pending", retrievedAppeal.status, "pending");
  TestValidator.equals(
    "ban record ID matches",
    retrievedAppeal.banRecord.id,
    banRecord.id,
  );
  TestValidator.equals("user ID matches", retrievedAppeal.user.id, userId);
  TestValidator.predicate(
    "appealed at timestamp exists",
    retrievedAppeal.appealed_at !== null,
  );
  TestValidator.equals(
    "decision reason is null for pending appeal",
    retrievedAppeal.decision_reason,
    null,
  );
  TestValidator.equals(
    "reviewed at is null for pending appeal",
    retrievedAppeal.reviewed_at,
    null,
  );
  TestValidator.equals(
    "reviewer is null for pending appeal",
    retrievedAppeal.reviewer,
    null,
  );
}
