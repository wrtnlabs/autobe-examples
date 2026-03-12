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
 * Test that an authenticated member can retrieve their own administrator request that has been approved with a decision record.
 *
 * 1. Register and authenticate as a regular member
 * 2. Submit an administrator request with a valid reason
 * 3. Retrieve the approved request with decision details
 * 4. Validate the response contains approved status and decision information
 */
export async function test_api_admin_request_member_retrieves_approved_request_with_decision(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member registration and authentication
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 3 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(memberAuth);
  // 2. Submit administrator request
  const adminRequest =
    await generate_random_discussion_board_member_admin_requests_create(
      memberConnection,
      {
        body: {
          reason: RandomGenerator.paragraph({ sentences: 5 }),
        },
      },
    );
  typia.assert(adminRequest);
  // 3. Retrieve the approved request (simulating system approval)
  const retrievedRequest =
    await api.functional.discussionBoard.member.admin_requests.at(
      memberConnection,
      {
        requestId: adminRequest.id,
      },
    );
  typia.assert(retrievedRequest);
  // 4. Validate response
  TestValidator.equals(
    "request ID matches",
    retrievedRequest.id,
    adminRequest.id,
  );
  TestValidator.equals(
    "status is approved",
    retrievedRequest.status,
    "approved",
  );
  TestValidator.equals(
    "member matches",
    retrievedRequest.member.id,
    memberAuth.id,
  );
  TestValidator.predicate(
    "reviewed_at is present",
    retrievedRequest.reviewed_at !== null,
  );
  TestValidator.predicate(
    "reviewingAdministrator is present",
    retrievedRequest.reviewingAdministrator !== null,
  );
  TestValidator.equals(
    "decision type is approved",
    retrievedRequest.decision.decision_type,
    "approved",
  );
  TestValidator.equals(
    "reviewer matches reviewing administrator",
    retrievedRequest.decision.reviewer.id,
    retrievedRequest.reviewingAdministrator.id,
  );
}
