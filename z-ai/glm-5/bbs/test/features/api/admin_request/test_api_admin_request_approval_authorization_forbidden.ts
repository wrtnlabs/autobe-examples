import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdminRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdminRequest";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";
import { generate_random_discussion_board_user_admin_requests_create } from "../../../generate/generate_random_discussion_board_user_admin_requests_create";
import { prepare_random_discussion_board_admin_request } from "../../../prepare/prepare_random_discussion_board_admin_request";

/**
 * Test that authorization is properly enforced for admin request approval.
 * Only super administrators can approve requests. A regular member attempting
 * to approve a pending administrator request should receive a 403 Forbidden error.
 */
export async function test_api_admin_request_approval_authorization_forbidden(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create first member who will submit the admin request
  const requesterConnection: api.IConnection = { host: connection.host };
  const requester = await authorize_user_join(requesterConnection, {
    body: {
      displayName: RandomGenerator.name(),
    },
  });
  typia.assert(requester);
  // 2. Submit a pending administrator request
  const adminRequest =
    await generate_random_discussion_board_user_admin_requests_create(
      requesterConnection,
      {},
    );
  typia.assert(adminRequest);
  // 3. Create a second member who will attempt to approve the admin request
  // This user is a regular MEMBER without SUPER_ADMINISTRATOR privileges
  const regularMemberConnection: api.IConnection = { host: connection.host };
  const regularMember = await authorize_user_join(regularMemberConnection, {
    body: {
      displayName: RandomGenerator.name(),
    },
  });
  typia.assert(regularMember);
  // 4. Attempt to approve the request as a regular member
  // Should fail with 403 Forbidden because only SUPER_ADMINISTRATOR can approve
  await TestValidator.httpError(
    "regular member cannot approve admin request",
    403,
    async () => {
      await api.functional.discussionBoard.user.adminRequests.approve(
        regularMemberConnection,
        {
          adminRequestId: adminRequest.id,
          body: {
            reviewNotes: "Unauthorized approval attempt",
          } satisfies IDiscussionBoardAdminRequest.IApprove,
        },
      );
    },
  );
}
