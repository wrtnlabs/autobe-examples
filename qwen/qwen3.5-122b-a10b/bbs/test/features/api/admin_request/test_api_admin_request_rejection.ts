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

/**
 * Test super administrator rejecting a member's administrator privilege request.
 *
 * This test validates the complete rejection workflow:
 * 1. Super administrator account is created
 * 2. Member account is created
 * 3. Member submits an administrator privilege request
 * 4. Super administrator rejects the request
 * 5. Validates the rejection status, reviewer information, and timestamp are correctly recorded
 */
export async function test_api_admin_request_rejection(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create super administrator
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      grade: "super",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  typia.assert(admin);
  // 2. Create member
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      displayName: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardMember.IJoin,
  });
  typia.assert(member);
  // 3. Member submits administrator privilege request
  const request =
    await api.functional.discussionBoard.member.admin_requests.create(
      memberConnection,
      {
        body: {
          reason: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IDiscussionBoardAdminRequest.ICreate,
      },
    );
  typia.assert(request);
  // Validate initial state
  TestValidator.equals("initial status is pending", request.status, "pending");
  TestValidator.equals("request has member", request.member.id, member.id);
  TestValidator.equals(
    "reviewer is null before review",
    request.reviewer,
    null,
  );
  TestValidator.equals(
    "reviewed_at is null before review",
    request.reviewed_at,
    null,
  );
  // 4. Super administrator rejects the request
  const updatedRequest =
    await api.functional.discussionBoard.admin.admin_requests.update(
      adminConnection,
      {
        adminRequestId: request.id,
        body: {
          status: "rejected",
        } satisfies IDiscussionBoardAdminRequest.IUpdate,
      },
    );
  typia.assert(updatedRequest);
  // 5. Validate rejection results
  TestValidator.equals("status is rejected", updatedRequest.status, "rejected");
  TestValidator.equals(
    "reviewer matches super admin",
    updatedRequest.reviewer?.id,
    admin.id,
  );
  TestValidator.predicate(
    "reviewed_at is set",
    updatedRequest.reviewed_at !== null,
  );
  TestValidator.equals(
    "member reference preserved",
    updatedRequest.member.id,
    member.id,
  );
  TestValidator.equals("request ID preserved", updatedRequest.id, request.id);
}
