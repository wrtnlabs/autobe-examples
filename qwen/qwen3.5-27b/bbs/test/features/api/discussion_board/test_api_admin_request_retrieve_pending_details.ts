import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdminRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdminRequest";
import type { IDiscussionBoardAdminRequestDecision } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdminRequestDecision";
import type { IDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrator";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_discussion_board_member_admin_requests_create } from "../../../generate/generate_random_discussion_board_member_admin_requests_create";
import { prepare_random_discussion_board_admin_request } from "../../../prepare/prepare_random_discussion_board_admin_request";

/**
 * Test that an administrator can retrieve detailed information about a pending administrator privilege escalation request.
 * Validates the request details are returned correctly including member info, reason, status, timestamps,
 * and that the request is in pending state.
 */
export async function test_api_admin_request_retrieve_pending_details(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
    },
  });
  typia.assert(memberAuth);
  // 2. Member submits admin privilege request
  const request =
    await generate_random_discussion_board_member_admin_requests_create(
      memberConnection,
      {
        body: {
          reason: RandomGenerator.paragraph({ sentences: 3 }),
        },
      },
    );
  typia.assert(request);
  // 3. Register and authenticate as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_administrator_join(adminConnection, {
    body: {
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
    },
  });
  typia.assert(adminAuth);
  // 4. Administrator retrieves the pending request details
  const retrievedRequest =
    await api.functional.discussionBoard.administrator.admin_requests.at(
      adminConnection,
      {
        requestId: request.id,
      },
    );
  typia.assert(retrievedRequest);
  // 5. Validate request details
  TestValidator.equals("request ID matches", retrievedRequest.id, request.id);
  TestValidator.equals(
    "reason matches",
    retrievedRequest.reason,
    request.reason,
  );
  TestValidator.equals("status is pending", retrievedRequest.status, "pending");
  TestValidator.equals(
    "member ID matches",
    retrievedRequest.member.id,
    memberAuth.id,
  );
  TestValidator.predicate("submitted_at is valid date-time", () => {
    const date = new Date(retrievedRequest.submitted_at);
    return !isNaN(date.getTime());
  });
  TestValidator.predicate("created_at is valid date-time", () => {
    const date = new Date(retrievedRequest.created_at);
    return !isNaN(date.getTime());
  });
  TestValidator.predicate("updated_at is valid date-time", () => {
    const date = new Date(retrievedRequest.updated_at);
    return !isNaN(date.getTime());
  });
  TestValidator.equals(
    "deleted_at is null for active request",
    retrievedRequest.deleted_at,
    null,
  );
  TestValidator.equals(
    "reviewed_at is null for pending request",
    retrievedRequest.reviewed_at,
    null,
  );
}
