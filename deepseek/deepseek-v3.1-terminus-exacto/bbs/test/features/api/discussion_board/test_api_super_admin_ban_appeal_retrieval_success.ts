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

/**
 * Test successful retrieval of a ban appeal by a super administrator.
 * Creates a ban record, then creates an appeal from the banned user,
 * and verifies the super administrator can retrieve complete appeal
 * information including appeal reason, status, ban details, appealing
 * user information, and timestamps.
 */
export async function test_api_super_admin_ban_appeal_retrieval_success(
  connection: api.IConnection,
): Promise<void> {
  // Create actor-specific connections
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      privilege_level: "super_admin",
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
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
  const userConnection: api.IConnection = { host: connection.host };
  const userJoinResponse = await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
    } satisfies IDiscussionBoardUser.IJoin,
  });
  typia.assert(userJoinResponse);
  // Create ban record
  const banRecord =
    await generate_random_discussion_board_admin_ban_records_create(
      adminConnection,
      {
        body: {
          ban_reason: RandomGenerator.paragraph({ sentences: 3 }),
          ban_duration_days: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1>
          >(),
          ban_status: "active",
        } satisfies IDiscussionBoardBanRecord.ICreate,
      },
    );
  typia.assert(banRecord);
  // Create appeal from banned user
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
  // Retrieve appeal as super admin
  const retrievedAppeal =
    await api.functional.discussionBoard.superAdmin.bans.appeals.at(
      superAdminConnection,
      {
        banId: banRecord.id,
        appealId: appeal.id,
      },
    );
  typia.assert(retrievedAppeal);
  // Validate appeal information
  TestValidator.equals("appeal ID matches", retrievedAppeal.id, appeal.id);
  TestValidator.equals(
    "appeal reason matches",
    retrievedAppeal.appeal_reason,
    appeal.appeal_reason,
  );
  TestValidator.equals(
    "appeal status is pending",
    retrievedAppeal.status,
    "pending",
  );
  TestValidator.predicate(
    "appeal has valid timestamp",
    retrievedAppeal.appealed_at.length > 0,
  );
  // Validate ban record linkage
  TestValidator.equals(
    "ban record ID matches",
    retrievedAppeal.banRecord.id,
    banRecord.id,
  );
  TestValidator.equals(
    "ban reason matches",
    retrievedAppeal.banRecord.ban_reason,
    banRecord.ban_reason,
  );
  TestValidator.equals(
    "ban status matches",
    retrievedAppeal.banRecord.ban_status,
    banRecord.ban_status,
  );
  TestValidator.predicate(
    "ban record has valid created_at timestamp",
    retrievedAppeal.banRecord.created_at.length > 0,
  );
  TestValidator.predicate(
    "ban record has valid updated_at timestamp",
    retrievedAppeal.banRecord.updated_at.length > 0,
  );
  // Validate user information
  TestValidator.equals(
    "user ID matches",
    retrievedAppeal.user.id,
    userJoinResponse.id,
  );
  TestValidator.equals(
    "user display name matches",
    retrievedAppeal.user.display_name,
    userJoinResponse.display_name,
  );
  TestValidator.equals(
    "user bio matches",
    retrievedAppeal.user.bio,
    userJoinResponse.bio,
  );
  // Validate timestamps
  TestValidator.predicate(
    "created_at timestamp valid",
    retrievedAppeal.created_at.length > 0,
  );
  TestValidator.predicate(
    "updated_at timestamp valid",
    retrievedAppeal.updated_at.length > 0,
  );
  TestValidator.equals(
    "reviewed_at is null for pending appeal",
    retrievedAppeal.reviewed_at,
    null,
  );
  TestValidator.equals(
    "reviewer is null for pending appeal",
    retrievedAppeal.reviewer,
    null,
  );
  TestValidator.equals(
    "decision_reason is null for pending appeal",
    retrievedAppeal.decision_reason,
    null,
  );
}
