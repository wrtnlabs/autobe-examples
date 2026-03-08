import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardAdminRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdminRequest";
import type { IDiscussionBoardAdminRequestHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdminRequestHistory";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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
import { generate_random_discussion_board_member_admin_requests_create } from "../../../generate/generate_random_discussion_board_member_admin_requests_create";
import { prepare_random_discussion_board_admin_request } from "../../../prepare/prepare_random_discussion_board_admin_request";

export async function test_api_admin_request_history_pending_record_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create member and member-specific connection
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      displayName: RandomGenerator.name(),
    },
  });
  typia.assert(memberAuth);
  // Step 2: Member submits admin request (creates history with pending status)
  const adminRequest =
    await generate_random_discussion_board_member_admin_requests_create(
      memberConnection,
      {
        body: {
          reason: RandomGenerator.paragraph({ sentences: 3 }),
        },
      },
    );
  typia.assert(adminRequest);
  // Step 3: Create admin and admin-specific connection
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      display_name: RandomGenerator.name(),
    },
  });
  typia.assert(adminAuth);
  // Step 4: Admin retrieves the history record
  // The history record ID should be related to the admin request ID
  // For pending status, the history record is created automatically
  const historyRecord =
    await api.functional.discussionBoard.admin.admin_request_histories.at(
      adminConnection,
      {
        adminRequestHistoryId: adminRequest.id,
      },
    );
  typia.assert(historyRecord);
  // Step 5: Validate the pending history record structure
  TestValidator.equals(
    "history status is pending",
    historyRecord.status,
    "pending",
  );
  TestValidator.equals(
    "reviewer is null for pending",
    historyRecord.reviewer,
    null,
  );
  // Validate adminRequest nested object
  TestValidator.predicate(
    "adminRequest has member info",
    historyRecord.adminRequest.member !== null,
  );
  TestValidator.equals(
    "adminRequest status matches",
    historyRecord.adminRequest.status,
    "pending",
  );
  TestValidator.equals(
    "adminRequest reason matches original",
    historyRecord.adminRequest.reason,
    adminRequest.reason,
  );
}
