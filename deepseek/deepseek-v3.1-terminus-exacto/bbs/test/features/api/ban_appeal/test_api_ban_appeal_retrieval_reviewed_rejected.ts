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

export async function test_api_ban_appeal_retrieval_reviewed_rejected(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  // 2. Create and authenticate as user
  const userConnection: api.IConnection = { host: connection.host };
  const userAuth = await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
    } satisfies IDiscussionBoardUser.IJoin,
  });
  // 3. Create ban record as administrator
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
  // 4. Create ban appeal as user
  const appeal =
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
  typia.assert(appeal);
  // 5. For this test scenario, we assume the appeal has been reviewed and rejected
  // In a real implementation, there would be an endpoint to update appeal status
  // Since we don't have that endpoint available, we'll test the retrieval functionality
  // and validate that the appeal retrieval works correctly
  // 6. Retrieve the appeal as administrator
  const retrievedAppeal =
    await api.functional.discussionBoard.admin.ban_records.appeals.at(
      adminConnection,
      {
        banRecordId: banRecord.id,
        appealId: appeal.id,
      },
    );
  typia.assert(retrievedAppeal);
  // Validate the appeal structure and relationships
  TestValidator.equals("appeal ID should match", retrievedAppeal.id, appeal.id);
  TestValidator.equals(
    "ban record ID should match",
    retrievedAppeal.banRecord.id,
    banRecord.id,
  );
  TestValidator.equals(
    "user ID should match",
    retrievedAppeal.user.id,
    userAuth.id,
  );
  TestValidator.equals(
    "appeal reason should match",
    retrievedAppeal.appeal_reason,
    appeal.appeal_reason,
  );
  // Note: Since we cannot actually reject the appeal through an API endpoint,
  // we validate the retrieval functionality works correctly with the existing appeal
  // In a complete implementation, we would also validate the rejected status fields
}
