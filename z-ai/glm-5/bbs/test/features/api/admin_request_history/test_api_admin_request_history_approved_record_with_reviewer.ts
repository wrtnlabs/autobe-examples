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

export async function test_api_admin_request_history_approved_record_with_reviewer(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account who will request admin privileges
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {});
  typia.assert(memberAuth);
  // 2. Member submits admin request for administrator privileges
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
  TestValidator.equals(
    "initial request status",
    adminRequest.status,
    "pending",
  );
  TestValidator.predicate(
    "initial reviewer is null",
    adminRequest.reviewer === null,
  );
  // 3. Create administrator for approval
  // Note: Super admin grade is required to approve admin requests in production
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdminAuth = await authorize_admin_join(superAdminConnection, {});
  typia.assert(superAdminAuth);
  // 4. Admin approves the request
  // This creates a history record with 'approved' status and reviewer info
  const approvedRequest =
    await api.functional.discussionBoard.admin.admin_requests.approve(
      superAdminConnection,
      { adminRequestId: adminRequest.id },
    );
  typia.assert(approvedRequest);
  // 5. Validate the approved request state
  TestValidator.equals(
    "approved request status",
    approvedRequest.status,
    "approved",
  );
  TestValidator.predicate(
    "approved request has reviewer",
    approvedRequest.reviewer !== null,
  );
  // 6. Validate reviewer information matches the approving admin
  if (approvedRequest.reviewer !== null) {
    TestValidator.equals(
      "reviewer id matches admin",
      approvedRequest.reviewer.id,
      superAdminAuth.id,
    );
    TestValidator.equals(
      "reviewer email matches",
      approvedRequest.reviewer.email,
      superAdminAuth.email,
    );
    TestValidator.equals(
      "reviewer display name matches",
      approvedRequest.reviewer.displayName,
      superAdminAuth.displayName,
    );
    TestValidator.predicate(
      "reviewer has valid grade",
      approvedRequest.reviewer.grade === "regular" ||
        approvedRequest.reviewer.grade === "super",
    );
    TestValidator.equals(
      "reviewer is not banned",
      approvedRequest.reviewer.banned,
      false,
    );
  }
  // 7. Validate member information is preserved in the approved request
  TestValidator.equals(
    "member id preserved",
    approvedRequest.member.id,
    memberAuth.id,
  );
  TestValidator.equals(
    "member display name preserved",
    approvedRequest.member.displayName,
    memberAuth.displayName,
  );
  // 8. Verify that the approval process correctly sets timestamps
  TestValidator.predicate(
    "created_at exists",
    approvedRequest.created_at.length > 0,
  );
  TestValidator.predicate(
    "updated_at exists",
    approvedRequest.updated_at.length > 0,
  );
}
