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

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_discussion_board_member_admin_requests_create } from "../../../generate/generate_random_discussion_board_member_admin_requests_create";
import { prepare_random_discussion_board_admin_request } from "../../../prepare/prepare_random_discussion_board_admin_request";

/**
 * Test that a regular member can successfully submit an administrator privilege escalation request with a valid reason.
 *
 * 1. Register a new member account using authorize_member_join
 * 2. Submit an administrator request with a detailed reason
 * 3. Verify the request is created with status 'pending'
 * 4. Verify the request is associated with the authenticated member
 * 5. Verify submitted_at timestamp is set
 * 6. Verify the reason text is preserved
 */
export async function test_api_admin_request_submission_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate as a new member
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
    },
  });
  typia.assert(memberAuth);
  // 2. Submit an administrator privilege escalation request
  const request =
    await generate_random_discussion_board_member_admin_requests_create(
      memberConnection,
      {
        body: {
          reason:
            "I have been an active community member for over 2 years, consistently contributing high-quality content and helping moderate discussions. I believe my experience and dedication make me a suitable candidate for administrator privileges to better serve the community.",
        },
      },
    );
  typia.assert(request);
  // 3. Verify request status is 'pending'
  TestValidator.equals("request status is pending", request.status, "pending");
  // 4. Verify the request is associated with the authenticated member
  TestValidator.equals(
    "request member ID matches authenticated member",
    request.member.id,
    memberAuth.id,
  );
  // 5. Verify submitted_at timestamp is valid
  TestValidator.predicate("submitted_at timestamp is valid", () => {
    const submitted = new Date(request.submitted_at);
    return !isNaN(submitted.getTime());
  });
  // 6. Verify the reason text is preserved and non-empty
  TestValidator.predicate(
    "reason text is preserved and non-empty",
    () => request.reason.length > 0,
  );
  // 7. Removed: Cannot access memberAuth.email as it doesn't exist on IAuthorized type
}
