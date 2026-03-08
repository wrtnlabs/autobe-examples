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

export async function test_api_admin_request_already_processed_conflict(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create a member who will submit the admin request
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {});
  typia.assert(member);
  // 2. Member creates an admin request
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
  // 3. Create first super admin to perform initial rejection
  const superAdmin1Connection: api.IConnection = { host: connection.host };
  const superAdmin1 = await authorize_admin_join(superAdmin1Connection, {});
  typia.assert(superAdmin1);
  // 4. First super admin rejects the request
  const rejectedRequest =
    await api.functional.discussionBoard.admin.admin_requests.reject(
      superAdmin1Connection,
      {
        adminRequestId: adminRequest.id,
      },
    );
  typia.assert(rejectedRequest);
  // Verify the request was rejected
  TestValidator.equals(
    "request status is rejected",
    rejectedRequest.status,
    "rejected",
  );
  TestValidator.equals(
    "reviewer is super admin 1",
    rejectedRequest.reviewer?.id,
    superAdmin1.id,
  );
  // 5. Create second super admin to attempt duplicate rejection
  const superAdmin2Connection: api.IConnection = { host: connection.host };
  const superAdmin2 = await authorize_admin_join(superAdmin2Connection, {});
  typia.assert(superAdmin2);
  // 6. Second super admin attempts to reject the already processed request - should fail with 409
  await TestValidator.httpError(
    "duplicate rejection should return 409 Conflict",
    409,
    async () =>
      await api.functional.discussionBoard.admin.admin_requests.reject(
        superAdmin2Connection,
        {
          adminRequestId: adminRequest.id,
        },
      ),
  );
}
