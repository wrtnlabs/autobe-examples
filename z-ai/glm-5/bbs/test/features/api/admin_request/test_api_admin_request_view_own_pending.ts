import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardAdminRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdminRequest";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_discussion_board_member_admin_requests_create } from "../../../generate/generate_random_discussion_board_member_admin_requests_create";
import { prepare_random_discussion_board_admin_request } from "../../../prepare/prepare_random_discussion_board_admin_request";

/**
 * Test that a member can successfully view their own pending
 * administrator privilege request.
 */
export async function test_api_admin_request_view_own_pending(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup: Create member and authenticate
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {});
  typia.assert(member);
  // 2. Create an admin request as the member
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
  // 3. Retrieve the admin request by ID
  const retrieved =
    await api.functional.discussionBoard.member.admin_requests.at(
      memberConnection,
      {
        adminRequestId: adminRequest.id,
      },
    );
  typia.assert(retrieved);
  // 4. Validate the response data
  TestValidator.equals("ID matches", retrieved.id, adminRequest.id);
  TestValidator.equals("reason matches", retrieved.reason, adminRequest.reason);
  TestValidator.equals("status is pending", retrieved.status, "pending");
  TestValidator.equals("reviewer is null", retrieved.reviewer, null);
  TestValidator.equals("member ID matches", retrieved.member.id, member.id);
  TestValidator.predicate("created_at is set", retrieved.created_at.length > 0);
  TestValidator.equals(
    "updated_at equals created_at",
    retrieved.updated_at,
    retrieved.created_at,
  );
  TestValidator.equals("deleted_at is null", retrieved.deleted_at, null);
}
