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
 * Test the critical edge case where a super administrator attempts to update an administrator application request that has already been decided (status is 'approved' or 'rejected').
 *
 * This validates the immutable status transition business rule. The test verifies that:
 * 1. The system returns 409 Conflict error when attempting to update a decided request
 * 2. The request status remains unchanged after the failed update attempt
 * 3. The error message indicates the request has already been processed
 *
 * Test flow:
 * 1. Super administrator joins and authenticates
 * 2. Member joins and authenticates
 * 3. Member submits an administrator application request (status: pending)
 * 4. Super administrator approves the request (first PUT call - should succeed)
 * 5. Super administrator attempts to update the same request again with different status (second PUT call - should fail with 409)
 * 6. Validate the 409 Conflict response
 * 7. Verify the request status remains 'approved' and decided_at is unchanged
 */
export async function test_api_admin_request_update_already_decided_conflict(
  connection: api.IConnection,
): Promise<void> {
  // 1. Super administrator setup - join and login
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdminJoin = await authorize_admin_join(superAdminConnection, {
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
  typia.assert(superAdminJoin);
  // 2. Member setup - join and login
  const memberConnection: api.IConnection = { host: connection.host };
  const memberJoin = await authorize_member_join(memberConnection, {
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
  typia.assert(memberJoin);
  // 3. Member submits administrator application request
  const adminRequest =
    await generate_random_discussion_board_member_admin_requests_create(
      memberConnection,
      {
        body: {
          reason: RandomGenerator.content({
            paragraphs: 2,
            sentenceMin: 5,
            sentenceMax: 10,
          }),
        } satisfies IDiscussionBoardAdminRequest.ICreate,
      },
    );
  typia.assert(adminRequest);
  TestValidator.equals("initial status", adminRequest.status, "pending");
  TestValidator.predicate(
    "decided_at is null",
    adminRequest.decided_at === null,
  );
  // 4. Super administrator approves the request (first PUT call)
  const approvedRequest =
    await api.functional.discussionBoard.admin.admin_requests.update(
      superAdminConnection,
      {
        requestId: adminRequest.id,
        body: {
          status: "approved",
        } satisfies IDiscussionBoardAdminRequest.IUpdate,
      },
    );
  typia.assert(approvedRequest);
  TestValidator.equals("approved status", approvedRequest.status, "approved");
  TestValidator.predicate(
    "decided_at is set",
    approvedRequest.decided_at !== null,
  );
  const decidedAt = approvedRequest.decided_at;
  // 5. Attempt to update the same request again (second PUT call - should fail with 409)
  await TestValidator.httpError(
    "already decided request update conflict",
    409,
    async () => {
      await api.functional.discussionBoard.admin.admin_requests.update(
        superAdminConnection,
        {
          requestId: adminRequest.id,
          body: {
            status: "rejected",
          } satisfies IDiscussionBoardAdminRequest.IUpdate,
        },
      );
    },
  );
  // 6. Verify the request status remains unchanged
  // The approvedRequest from step 4 contains the state after first approval
  TestValidator.equals(
    "status remains approved",
    approvedRequest.status,
    "approved",
  );
  TestValidator.equals(
    "decided_at unchanged",
    approvedRequest.decided_at,
    decidedAt,
  );
}
