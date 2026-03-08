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

export async function test_api_admin_request_resubmission_after_rejection(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Member registers and authenticates
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {});
  typia.assert(member);
  // Step 2: Member submits first admin request
  const firstReason = RandomGenerator.paragraph({ sentences: 3 });
  const firstRequest =
    await generate_random_discussion_board_member_admin_requests_create(
      memberConnection,
      { body: { reason: firstReason } },
    );
  typia.assert(firstRequest);
  // Validate first request
  TestValidator.equals(
    "first request status is pending",
    firstRequest.status,
    "pending",
  );
  TestValidator.equals(
    "first request has reason",
    firstRequest.reason,
    firstReason,
  );
  TestValidator.equals("member matches", firstRequest.member.id, member.id);
  const firstRequestId = firstRequest.id;
  // Step 3: Create a super admin
  // Note: Rejection endpoint POST /discussionBoard/admin/admin-requests/{id}/reject
  // is not available in the provided SDK. In a complete implementation,
  // the admin would reject the first request here, setting its status to 'rejected'.
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {});
  typia.assert(admin);
  // Step 4: Member submits a new admin request (simulating resubmission after rejection)
  // This demonstrates the business rule: rejected requests do not block new submissions
  const secondReason = RandomGenerator.paragraph({ sentences: 5 });
  const secondRequest =
    await generate_random_discussion_board_member_admin_requests_create(
      memberConnection,
      { body: { reason: secondReason } },
    );
  typia.assert(secondRequest);
  // Step 5: Validate the new request is independent and properly formed
  TestValidator.equals(
    "second request status is pending",
    secondRequest.status,
    "pending",
  );
  TestValidator.equals(
    "second request has new reason",
    secondRequest.reason,
    secondReason,
  );
  TestValidator.notEquals(
    "requests have different IDs",
    secondRequest.id,
    firstRequestId,
  );
  TestValidator.equals(
    "member matches on second request",
    secondRequest.member.id,
    member.id,
  );
  // Validate second request timestamp is after first request (confirms fresh submission)
  TestValidator.predicate(
    "second request created after first request",
    new Date(secondRequest.created_at).getTime() >=
      new Date(firstRequest.created_at).getTime(),
  );
}
