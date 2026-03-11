import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardAdminRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdminRequest";
import type { IDiscussionBoardAdministrativeHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrativeHistory";
import type { IDiscussionBoardAdministratorAssignment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorAssignment";
import type { IDiscussionBoardAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAuditLog";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardUserBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUserBan";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardAdministrativeHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdministrativeHistory";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_discussion_board_admin_user_bans_create } from "../../../generate/generate_random_discussion_board_admin_user_bans_create";
import { generate_random_discussion_board_member_admin_requests_create } from "../../../generate/generate_random_discussion_board_member_admin_requests_create";
import { prepare_random_discussion_board_admin_request } from "../../../prepare/prepare_random_discussion_board_admin_request";
import { prepare_random_discussion_board_user_ban } from "../../../prepare/prepare_random_discussion_board_user_ban";

export async function test_api_administrative_history_retrieval_by_super_admin(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create super administrator account
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdmin = await api.functional.discussionBoard.auth.admin.join(
    superAdminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
      } satisfies IDiscussionBoardAdmin.IJoin,
    },
  );
  typia.assert(superAdmin);
  // 2. Create member account that will be banned
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await api.functional.discussionBoard.auth.member.join(
    memberConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        display_name: RandomGenerator.name(),
        bio: RandomGenerator.paragraph({ sentences: 2 }),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      } satisfies IDiscussionBoardMember.IJoin,
    },
  );
  typia.assert(member);
  // 3. Create admin request for approval
  const adminRequest =
    await api.functional.discussionBoard.member.admin_requests.create(
      memberConnection,
      {
        body: {
          reason: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IDiscussionBoardAdminRequest.ICreate,
      },
    );
  typia.assert(adminRequest);
  // 4. Perform administrative actions: ban member
  const userBan = await api.functional.discussionBoard.admin.user_bans.create(
    superAdminConnection,
    {
      body: {
        member_id: member.id,
        reason: RandomGenerator.paragraph({ sentences: 2 }),
        expires_at: null,
      } satisfies IDiscussionBoardUserBan.ICreate,
    },
  );
  typia.assert(userBan);
  // 5. Search for administrative histories to find target record ID
  const searchResults =
    await api.functional.discussionBoard.admin.administrative_histories.index(
      superAdminConnection,
      {
        body: {
          action_type: null,
          target_type: null,
          administrator_id: null,
          search: null,
          start_date: null,
          end_date: null,
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardAdministrativeHistory.IRequest,
      },
    );
  typia.assert(searchResults);
  // Find a history record that matches our user ban action
  const targetHistory = searchResults.data.find(
    (history) =>
      history.target_type === "user_ban" && history.target_id === userBan.id,
  );
  TestValidator.predicate(
    "should find administrative history record for user ban",
    targetHistory !== undefined,
  );
  // 6. Retrieve the specific history record by its ID
  const retrievedHistory =
    await api.functional.discussionBoard.admin.administrative_histories.at(
      superAdminConnection,
      {
        historyId: targetHistory!.id,
      },
    );
  typia.assert(retrievedHistory);
  // Validations
  TestValidator.equals(
    "history ID matches",
    retrievedHistory.id,
    targetHistory!.id,
  );
  TestValidator.predicate(
    "action_type should be valid",
    retrievedHistory.action_type.length > 0,
  );
  TestValidator.equals(
    "target_type should be user_ban",
    retrievedHistory.target_type,
    "user_ban",
  );
  TestValidator.predicate(
    "description should be present",
    retrievedHistory.description.length > 0,
  );
  TestValidator.predicate(
    "administrator details should be included",
    retrievedHistory.administrator !== undefined,
  );
  TestValidator.predicate(
    "userBan details should be included",
    retrievedHistory.userBan !== undefined,
  );
  TestValidator.equals(
    "userBan ID matches",
    retrievedHistory.userBan!.id,
    userBan.id,
  );
  TestValidator.predicate(
    "created_at should be before updated_at",
    new Date(retrievedHistory.created_at) <
      new Date(retrievedHistory.updated_at),
  );
  TestValidator.equals(
    "target_id matches user ban ID",
    retrievedHistory.target_id,
    userBan.id,
  );
}
