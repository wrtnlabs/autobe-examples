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

export async function test_api_administrator_request_update_status_approved(
  connection: api.IConnection,
): Promise<void> {
  // Prepare connections for actors
  const superAdminConnection: api.IConnection = { host: connection.host };
  const registeredUserConnection: api.IConnection = { host: connection.host };
  // 1. Register and login super administrator
  const superAdminJoinResponse = await authorize_super_administrator_join(
    superAdminConnection,
    {},
  );
  typia.assert(superAdminJoinResponse);
  // After join, the authorization header is set automatically, use this connection
  superAdminConnection.headers = {
    Authorization: superAdminJoinResponse.token.access,
  };
  // 2. Register and login registered user
  const registeredUserJoinResponse = await authorize_registered_user_join(
    registeredUserConnection,
    { body: {} },
  );
  typia.assert(registeredUserJoinResponse);
  registeredUserConnection.headers = {
    Authorization: registeredUserJoinResponse.token.access,
  };
  // 3. Create administrator request as registered user
  const adminRequest =
    await generate_random_discussion_board_registered_user_administrator_requests_create_administrator_request(
      registeredUserConnection,
      { body: { reason: "Requesting admin privileges for testing." } },
    );
  typia.assert(adminRequest);
  // 4. Update administrator request status to 'approved' as super admin
  const updateRequestBody: IDiscussionBoardAdministratorRequest.IUpdate = {
    status: "approved",
  };
  const updatedRequest =
    await api.functional.discussionBoard.superAdministrator.administrator.requests.updateAdministratorRequest(
      superAdminConnection,
      {
        requestId: adminRequest.id,
        body: updateRequestBody,
      },
    );
  typia.assert(updatedRequest);
  // 5. Validate that the update was successful
  TestValidator.equals("request status", updatedRequest.status, "approved");
  TestValidator.equals("request id", updatedRequest.id, adminRequest.id);
  TestValidator.equals(
    "registered user id",
    updatedRequest.registered_user_id,
    registeredUserJoinResponse.id,
  );
  TestValidator.predicate(
    "updated timestamp is not older than created timestamp",
    updatedRequest.updated_at >= updatedRequest.created_at,
  );
  // Check that timestamp fields exist and are valid date-time strings
  typia.assert<string & tags.Format<"date-time">>(updatedRequest.created_at);
  typia.assert<string & tags.Format<"date-time">>(updatedRequest.updated_at);
  if (
    updatedRequest.deleted_at !== null &&
    updatedRequest.deleted_at !== undefined
  ) {
    typia.assert<(string & tags.Format<"date-time">) | null>(
      updatedRequest.deleted_at,
    );
  }
  // Registered user summary inside updatedRequest
  typia.assert(updatedRequest.registeredUser);
}
