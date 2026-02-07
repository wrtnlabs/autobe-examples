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

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";
import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";
import { generate_random_discussion_board_admin_ban_records_create } from "../../../generate/generate_random_discussion_board_admin_ban_records_create";
import { generate_random_discussion_board_user_ban_records_appeals_create } from "../../../generate/generate_random_discussion_board_user_ban_records_appeals_create";
import { prepare_random_discussion_board_ban_appeal } from "../../../prepare/prepare_random_discussion_board_ban_appeal";
import { prepare_random_discussion_board_ban_record } from "../../../prepare/prepare_random_discussion_board_ban_record";

export async function test_api_super_admin_ban_appeal_review_completed(
  connection: api.IConnection,
): Promise<void> {
  // Create super admin connection
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      privilege_level: "super_admin",
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  // Create admin connection (as reviewer)
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  // Create user connection (to be banned)
  const userConnection: api.IConnection = { host: connection.host };
  await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
    } satisfies IDiscussionBoardUser.IJoin,
  });
  // Create ban record for the user
  const banRecord =
    await generate_random_discussion_board_admin_ban_records_create(
      adminConnection,
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
  // Test approved appeal
  const approvedAppeal =
    await api.functional.discussionBoard.superAdmin.ban_records.appeals.putByBanrecordidAndAppealid(
      superAdminConnection,
      {
        banRecordId: banRecord.id,
        appealId: appeal.id,
        body: {
          status: "approved",
          decision_reason: "Appeal granted based on user's explanation",
        } satisfies IDiscussionBoardBanAppeal.IUpdate,
      },
    );
  typia.assert(approvedAppeal);
  // Retrieve approved appeal
  const retrievedApprovedAppeal =
    await api.functional.discussionBoard.superAdmin.bans.appeals.at(
      superAdminConnection,
      {
        banId: banRecord.id,
        appealId: appeal.id,
      },
    );
  typia.assert(retrievedApprovedAppeal);
  // Validate approved appeal data
  TestValidator.equals(
    "appeal ID matches",
    retrievedApprovedAppeal.id,
    appeal.id,
  );
  TestValidator.equals(
    "status is approved",
    retrievedApprovedAppeal.status,
    "approved",
  );
  TestValidator.predicate(
    "has decision reason",
    retrievedApprovedAppeal.decision_reason !== null,
  );
  TestValidator.predicate(
    "has reviewed timestamp",
    retrievedApprovedAppeal.reviewed_at !== null,
  );
  TestValidator.predicate(
    "has reviewer information",
    retrievedApprovedAppeal.reviewer !== null,
  );
  // Create a second appeal for rejected scenario
  const secondAppeal =
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
  typia.assert(secondAppeal);
  // Test rejected appeal
  const rejectedAppeal =
    await api.functional.discussionBoard.superAdmin.ban_records.appeals.putByBanrecordidAndAppealid(
      superAdminConnection,
      {
        banRecordId: banRecord.id,
        appealId: secondAppeal.id,
        body: {
          status: "rejected",
          decision_reason: "Appeal denied due to policy violation",
        } satisfies IDiscussionBoardBanAppeal.IUpdate,
      },
    );
  typia.assert(rejectedAppeal);
  // Retrieve rejected appeal
  const retrievedRejectedAppeal =
    await api.functional.discussionBoard.superAdmin.bans.appeals.at(
      superAdminConnection,
      {
        banId: banRecord.id,
        appealId: secondAppeal.id,
      },
    );
  typia.assert(retrievedRejectedAppeal);
  // Validate rejected appeal data
  TestValidator.equals(
    "appeal ID matches",
    retrievedRejectedAppeal.id,
    secondAppeal.id,
  );
  TestValidator.equals(
    "status is rejected",
    retrievedRejectedAppeal.status,
    "rejected",
  );
  TestValidator.predicate(
    "has decision reason",
    retrievedRejectedAppeal.decision_reason !== null,
  );
  TestValidator.predicate(
    "has reviewed timestamp",
    retrievedRejectedAppeal.reviewed_at !== null,
  );
  TestValidator.predicate(
    "has reviewer information",
    retrievedRejectedAppeal.reviewer !== null,
  );
}
