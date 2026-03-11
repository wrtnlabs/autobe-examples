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
 * Test the primary success path where a super administrator approves a pending administrator privilege request submitted by a member.
 * 1. Super admin joins and logs in
 * 2. Member joins and logs in
 * 3. Member submits administrator privilege request
 * 4. Super admin approves the request
 * 5. Verify request status transitions to 'approved'
 * 6. Verify reviewer information is recorded
 * 7. Verify reviewed_at timestamp is set
 */
export async function test_api_admin_request_approval(
  connection: api.IConnection,
): Promise<void> {
  // Generate member credentials
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = RandomGenerator.alphaNumeric(16);
  const memberDisplayName = RandomGenerator.name();
  // 1. Super admin setup - join and login
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdminAuth = await authorize_admin_join(superAdminConnection, {
    body: {
      grade: "super",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(superAdminAuth);
  // 2. Member setup - join and login
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: memberEmail,
      password: memberPassword,
      displayName: memberDisplayName,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(memberAuth);
  // 3. Member submits administrator privilege request
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
  // Verify initial status is pending
  TestValidator.equals("initial status is pending", request.status, "pending");
  TestValidator.equals(
    "reviewer is null before approval",
    request.reviewer,
    null,
  );
  TestValidator.equals(
    "reviewed_at is null before approval",
    request.reviewed_at,
    null,
  );
  // 4. Super admin approves the request
  const approvedRequest =
    await api.functional.discussionBoard.admin.admin_requests.update(
      superAdminConnection,
      {
        adminRequestId: request.id,
        body: {
          status: "approved",
        } satisfies IDiscussionBoardAdminRequest.IUpdate,
      },
    );
  typia.assert(approvedRequest);
  // 5. Verify status transitioned to approved
  TestValidator.equals(
    "status is approved",
    approvedRequest.status,
    "approved",
  );
  // 6. Verify reviewer information is recorded
  TestValidator.equals(
    "reviewer is not null",
    approvedRequest.reviewer !== null,
    true,
  );
  TestValidator.equals(
    "reviewer ID matches super admin",
    approvedRequest.reviewer?.id,
    superAdminAuth.id,
  );
  TestValidator.equals(
    "reviewed_at is not null",
    approvedRequest.reviewed_at !== null,
    true,
  );
  // 7. Verify timestamps are valid
  TestValidator.predicate(
    "reviewed_at is valid ISO datetime",
    approvedRequest.reviewed_at !== null &&
      !Number.isNaN(Date.parse(approvedRequest.reviewed_at)),
  );
  // 8. Verify member can still login after approval
  const memberLogin = await authorize_member_login(memberConnection, {
    body: {
      email: memberEmail,
      password: memberPassword,
    },
  });
  typia.assert(memberLogin);
  TestValidator.equals(
    "member login still works after approval",
    memberLogin.id,
    memberAuth.id,
  );
}
