import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdministratorRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorRequest";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";
import { generate_random_discussion_board_member_requests_create } from "../../../generate/generate_random_discussion_board_member_requests_create";
import { prepare_random_discussion_board_administrator_request } from "../../../prepare/prepare_random_discussion_board_administrator_request";

export async function test_api_super_admin_request_rejection_details(
  connection: api.IConnection,
): Promise<void> {
  // 1. Super admin authentication
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  // 2. Member authentication
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuthorized = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 1 }),
    } satisfies IDiscussionBoardMember.IJoin,
  });
  // 3. Member creates administrator request
  const request = await api.functional.discussionBoard.member.requests.create(
    memberConnection,
    {
      body: {
        reason:
          "I have experience managing community discussions and want to help maintain the quality of the board.",
        status: "pending",
      } satisfies IDiscussionBoardAdministratorRequest.ICreate,
    },
  );
  typia.assert(request);
  TestValidator.equals("initial status is pending", request.status, "pending");
  // 4. Super admin rejects the request
  const rejectionReason =
    "Your request does not meet the current requirements for administrator privileges. Please gain more community experience first.";
  const updatedRequest =
    await api.functional.discussionBoard.superAdmin.requests.reject(
      superAdminConnection,
      {
        requestId: request.id,
        body: {
          status: "rejected",
          rejection_reason: rejectionReason,
        } satisfies IDiscussionBoardAdministratorRequest.IUpdate,
      },
    );
  typia.assert(updatedRequest);
  // 5. Retrieve request details
  const retrievedRequest =
    await api.functional.discussionBoard.superAdmin.requests.at(
      superAdminConnection,
      {
        requestId: request.id,
      },
    );
  typia.assert(retrievedRequest);
  // 6. Verify rejection details
  TestValidator.equals(
    "status is rejected",
    retrievedRequest.status,
    "rejected",
  );
  TestValidator.equals(
    "rejection reason matches",
    retrievedRequest.rejection_reason,
    rejectionReason,
  );
  TestValidator.notEquals(
    "processed_at is set",
    retrievedRequest.processed_at,
    null,
  );
  TestValidator.notEquals("processor is set", retrievedRequest.processor, null);
  // Validate processor structure
  TestValidator.equals(
    "processor has id",
    retrievedRequest.processor?.id !== undefined,
    true,
  );
  TestValidator.equals(
    "processor has email",
    retrievedRequest.processor?.email !== undefined,
    true,
  );
  TestValidator.equals(
    "processor has display_name",
    retrievedRequest.processor?.display_name !== undefined,
    true,
  );
  TestValidator.equals(
    "processor has bio",
    retrievedRequest.processor?.bio !== undefined,
    true,
  );
}
