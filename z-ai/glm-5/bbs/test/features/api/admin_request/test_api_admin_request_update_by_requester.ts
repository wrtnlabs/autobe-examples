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

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_discussion_board_member_admin_requests_create } from "../../../generate/generate_random_discussion_board_member_admin_requests_create";
import { prepare_random_discussion_board_admin_request } from "../../../prepare/prepare_random_discussion_board_admin_request";

export async function test_api_admin_request_update_by_requester(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as a member
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {});
  // 2. Create a pending admin request with initial reason
  const initialReason =
    "I would like to become an administrator to help moderate the discussion board.";
  const adminRequest =
    await generate_random_discussion_board_member_admin_requests_create(
      memberConnection,
      {
        body: { reason: initialReason },
      },
    );
  typia.assert(adminRequest);
  // Store original values for comparison
  const originalId = adminRequest.id;
  const originalStatus = adminRequest.status;
  const originalMember = adminRequest.member;
  const originalCreatedAt = adminRequest.created_at;
  // 3. Update the admin request with new reason
  const updatedReason =
    "Updated: I have extensive experience in community moderation and would like to contribute as an administrator.";
  const updatedRequest =
    await api.functional.discussionBoard.admin.admin_requests.update(
      memberConnection,
      {
        adminRequestId: adminRequest.id,
        body: {
          reason: updatedReason,
        } satisfies IDiscussionBoardAdminRequest.IUpdate,
      },
    );
  typia.assert(updatedRequest);
  // 4. Validate the update response
  // Verify reason was updated
  TestValidator.equals(
    "reason should be updated",
    updatedRequest.reason,
    updatedReason,
  );
  // Verify status remains pending
  TestValidator.equals(
    "status should remain pending",
    updatedRequest.status,
    "pending",
  );
  // Verify id remains unchanged
  TestValidator.equals(
    "id should remain unchanged",
    updatedRequest.id,
    originalId,
  );
  // Verify member remains unchanged
  TestValidator.equals(
    "member id should remain unchanged",
    updatedRequest.member.id,
    originalMember.id,
  );
  // Verify created_at remains unchanged
  TestValidator.equals(
    "created_at should remain unchanged",
    updatedRequest.created_at,
    originalCreatedAt,
  );
  // Verify updated_at is later than created_at
  const updatedAtTime = new Date(updatedRequest.updated_at).getTime();
  const createdAtTime = new Date(updatedRequest.created_at).getTime();
  TestValidator.predicate(
    "updated_at should be later than created_at",
    updatedAtTime >= createdAtTime,
  );
  // Verify reviewer remains null (not yet reviewed)
  TestValidator.equals(
    "reviewer should remain null",
    updatedRequest.reviewer,
    null,
  );
}
