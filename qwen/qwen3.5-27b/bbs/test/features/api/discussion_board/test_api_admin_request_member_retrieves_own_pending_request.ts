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
 * Test that an authenticated member can retrieve their own administrator privilege escalation request that is currently pending review.
 *
 * 1. Register and authenticate as a regular member
 * 2. Submit an administrator request with a valid reason
 * 3. Retrieve the request using the requestId
 * 4. Validate all fields of the pending request
 */
export async function test_api_admin_request_member_retrieves_own_pending_request(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate as a regular member
  const memberEmail: string & tags.Format<"email"> = typia.random<string & tags.Format<"email">>();
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: memberEmail,
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(memberAuth);
  // 2. Submit an administrator request with a valid reason
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
  // 3. Retrieve the request using the requestId
  const retrieved =
    await api.functional.discussionBoard.member.admin_requests.at(
      memberConnection,
      {
        requestId: request.id,
      },
    );
  typia.assert(retrieved);
  // 4. Validate all fields of the pending request
  TestValidator.equals("request id matches", retrieved.id, request.id);
  TestValidator.equals("status is pending", retrieved.status, "pending");
  TestValidator.equals("member id matches", retrieved.member.id, memberAuth.id);
  TestValidator.equals(
    "member email matches",
    retrieved.member.email,
    memberEmail,
  );
  TestValidator.equals("reason matches", retrieved.reason, request.reason);
  TestValidator.predicate(
    "submitted_at is valid",
    retrieved.submitted_at !== undefined,
  );
  TestValidator.equals("reviewed_at is null", retrieved.reviewed_at, null);
  TestValidator.equals(
    "reviewingAdministrator is null",
    retrieved.reviewingAdministrator,
    null,
  );
  TestValidator.equals("decision is null", retrieved.decision, null);
  TestValidator.predicate(
    "created_at is valid",
    retrieved.created_at !== undefined,
  );
  TestValidator.predicate(
    "updated_at is valid",
    retrieved.updated_at !== undefined,
  );
}