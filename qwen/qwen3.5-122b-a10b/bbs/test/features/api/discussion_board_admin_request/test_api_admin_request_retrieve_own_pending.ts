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

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_discussion_board_member_admin_requests_create } from "../../../generate/generate_random_discussion_board_member_admin_requests_create";
import { prepare_random_discussion_board_admin_request } from "../../../prepare/prepare_random_discussion_board_admin_request";

/**
 * Test member retrieving their own pending administrator privilege request.
 * 1. Member registers and authenticates
 * 2. Member submits admin privilege request
 * 3. Member retrieves their own pending request details
 * 4. Validates request structure, member summary, null reviewer, and timestamps
 */
export async function test_api_admin_request_retrieve_own_pending(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member authentication
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      displayName: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardMember.IJoin,
  });
  typia.assert(memberAuth);
  // 2. Create admin request
  const adminRequest =
    await generate_random_discussion_board_member_admin_requests_create(
      memberConnection,
      {
        body: {
          reason: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IDiscussionBoardAdminRequest.ICreate,
      },
    );
  typia.assert(adminRequest);
  // 3. Retrieve the request
  const retrieved =
    await api.functional.discussionBoard.member.admin_requests.at(
      memberConnection,
      {
        adminRequestId: adminRequest.id,
      },
    );
  typia.assert(retrieved);
  // 4. Validate request core fields
  TestValidator.equals("request ID matches", retrieved.id, adminRequest.id);
  TestValidator.equals("reason matches", retrieved.reason, adminRequest.reason);
  TestValidator.equals("status is pending", retrieved.status, "pending");
  // 5. Validate member summary matches authenticated member
  TestValidator.equals("member ID matches", retrieved.member.id, memberAuth.id);
  TestValidator.equals(
    "member display_name matches",
    retrieved.member.display_name,
    memberAuth.display_name,
  );
  TestValidator.equals(
    "member ban_status is active",
    retrieved.member.ban_status,
    "active",
  );
  // 6. Validate reviewer is null (pending status means not yet reviewed)
  TestValidator.equals(
    "reviewer is null for pending request",
    retrieved.reviewer,
    null,
  );
  // 7. Validate timestamps exist and are properly formatted (typia.assert already validates ISO 8601)
  TestValidator.predicate(
    "submitted_at exists",
    retrieved.submitted_at !== null && retrieved.submitted_at !== undefined,
  );
  TestValidator.predicate(
    "created_at exists",
    retrieved.created_at !== null && retrieved.created_at !== undefined,
  );
  TestValidator.predicate(
    "updated_at exists",
    retrieved.updated_at !== null && retrieved.updated_at !== undefined,
  );
  TestValidator.equals(
    "deleted_at is null for active record",
    retrieved.deleted_at,
    null,
  );
}
