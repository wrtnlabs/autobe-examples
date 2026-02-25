import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdministratorRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorRequest";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleTag";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import type { IDiscussionBoardRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardRegisteredUser";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdministrator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_registered_user_join } from "../../../authorize/authorize_registered_user_join";
import { authorize_registered_user_login } from "../../../authorize/authorize_registered_user_login";
import { authorize_registered_user_refresh } from "../../../authorize/authorize_registered_user_refresh";
import { authorize_super_administrator_join } from "../../../authorize/authorize_super_administrator_join";
import { authorize_super_administrator_login } from "../../../authorize/authorize_super_administrator_login";
import { authorize_super_administrator_refresh } from "../../../authorize/authorize_super_administrator_refresh";
import { generate_random_discussion_board_registered_user_administrator_requests_create_administrator_request } from "../../../generate/generate_random_discussion_board_registered_user_administrator_requests_create_administrator_request";
import { prepare_random_discussion_board_administrator_request } from "../../../prepare/prepare_random_discussion_board_administrator_request";

/**
 * Scenario 2: Successfully update an existing administrator request status to 'rejected' by a super administrator with an updated reason.
 *
 * Steps:
 * 1. Authenticate as registered user and create an administrator request.
 * 2. Authenticate as super administrator.
 * 3. Update the administrator request status to 'rejected' with a rejection reason.
 * 4. Validate that the update was successful and reason was saved.
 */
export async function test_api_administrator_request_update_status_rejected_with_reason(
  connection: api.IConnection,
): Promise<void> {
  // 1. Prepare registered user and login
  const registeredUserJoinConnection: api.IConnection = {
    host: connection.host,
  };
  const registeredUser = await authorize_registered_user_join(
    registeredUserJoinConnection,
    {
      body: {
        email: RandomGenerator.alphaNumeric(10) + "@example.com",
        password: "UserPass123!",
      },
    },
  );
  const registeredUserConnection: api.IConnection = { host: connection.host };
  await authorize_registered_user_login(registeredUserConnection, {
    body: { email: registeredUser.email, password: "UserPass123!" },
  });
  // 2. Create administrator request as registered user
  const adminRequest =
    await generate_random_discussion_board_registered_user_administrator_requests_create_administrator_request(
      registeredUserConnection,
      {
        body: {
          reason: "Requesting admin privileges for testing purposes.",
        },
      },
    );
  // 3. Authenticate super administrator
  const superAdminJoinConnection: api.IConnection = { host: connection.host };
  const superAdministrator = await authorize_super_administrator_join(
    superAdminJoinConnection,
    {
      body: {
        email: RandomGenerator.alphaNumeric(10) + "@admin.com",
        password: "SuperAdminPass123!",
        href: "https://localhost",
        referrer: "https://localhost",
        ip: null,
      },
    },
  );
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_administrator_login(superAdminConnection, {
    body: { email: superAdministrator.email, password: "SuperAdminPass123!" },
  });
  // 4. Update administrator request status to 'rejected' with reason
  const updateBody = {
    status: "rejected" as const,
    reason: "The request is rejected due to insufficient justification.",
  } satisfies IDiscussionBoardAdministratorRequest.IUpdate;
  const updatedRequest =
    await api.functional.discussionBoard.superAdministrator.administrator.requests.updateAdministratorRequest(
      superAdminConnection,
      {
        requestId: adminRequest.id,
        body: updateBody,
      },
    );
  typia.assert(updatedRequest);
  // 5. Assertions
  TestValidator.equals("status is rejected", updatedRequest.status, "rejected");
  TestValidator.equals(
    "reason is updated",
    updatedRequest.reason,
    updateBody.reason,
  );
  TestValidator.predicate(
    "reason is not empty",
    updatedRequest.reason.length > 0,
  );
}
