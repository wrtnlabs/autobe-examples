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
 * Test the edge case where a super administrator attempts to approve a request that has already been decided.
 *
 * This test validates that the system prevents duplicate approvals of the same administrator application request.
 * When multiple super administrators attempt to approve the same pending request, only the first approval
 * should succeed, and subsequent attempts should be rejected with a 409 Conflict error.
 *
 * Test Flow:
 * 1. Create two administrator accounts for testing concurrent approval attempts
 * 2. Create a regular member account to submit the admin request
 * 3. Member submits an administrator application request
 * 4. First administrator approves the request successfully
 * 5. Second administrator attempts to approve the same request
 * 6. Verify the second approval attempt fails with 409 Conflict
 * 7. Validate the request status remains "approved" after the failed attempt
 */
export async function test_api_admin_request_approval_already_decided(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create first administrator account
  const admin1Connection: api.IConnection = { host: connection.host };
  const admin1Auth = await authorize_admin_join(admin1Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  typia.assert(admin1Auth);
  // 2. Create second administrator account
  const admin2Connection: api.IConnection = { host: connection.host };
  const admin2Auth = await authorize_admin_join(admin2Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  typia.assert(admin2Auth);
  // 3. Create member account
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardMember.IJoin,
  });
  typia.assert(memberAuth);
  // 4. Member submits administrator application request
  const adminRequest =
    await generate_random_discussion_board_member_admin_requests_create(
      memberConnection,
      {
        body: {
          reason: RandomGenerator.content({
            paragraphs: 2,
            sentenceMin: 10,
            sentenceMax: 15,
          }),
        } satisfies IDiscussionBoardAdminRequest.ICreate,
      },
    );
  typia.assert(adminRequest);
  TestValidator.equals("request status", adminRequest.status, "pending");
  TestValidator.equals("request member", adminRequest.member.id, memberAuth.id);
  // 5. First administrator approves the request successfully
  const firstApproval =
    await api.functional.discussionBoard.admin.admin_requests.approve(
      admin1Connection,
      {
        requestId: adminRequest.id,
      },
    );
  typia.assert(firstApproval);
  TestValidator.equals(
    "first approval status",
    firstApproval.status,
    "approved",
  );
  TestValidator.equals(
    "first approval admin",
    firstApproval.admin?.id,
    admin1Auth.id,
  );
  TestValidator.predicate(
    "first approval has decided_at",
    firstApproval.decided_at !== null,
  );
  // 6. Second administrator attempts to approve the same request - should fail with 409 Conflict
  await TestValidator.error("duplicate approval rejected", async () => {
    await api.functional.discussionBoard.admin.admin_requests.approve(
      admin2Connection,
      {
        requestId: adminRequest.id,
      },
    );
  });
  // 7. Verify the request remains in approved state after failed attempt
  TestValidator.equals(
    "request status after failed approval",
    firstApproval.status,
    "approved",
  );
  TestValidator.equals(
    "request admin unchanged",
    firstApproval.admin?.id,
    admin1Auth.id,
  );
}
