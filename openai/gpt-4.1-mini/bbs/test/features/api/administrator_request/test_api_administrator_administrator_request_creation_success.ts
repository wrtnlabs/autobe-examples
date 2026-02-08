import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrator";
import type { IDiscussionBoardAdministratorRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorRequest";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";
import { generate_random_discussion_board_administrator_administrator_requests_create_administrator_request } from "../../../generate/generate_random_discussion_board_administrator_administrator_requests_create_administrator_request";
import { prepare_random_discussion_board_administrator_request } from "../../../prepare/prepare_random_discussion_board_administrator_request";

export async function test_api_administrator_administrator_request_creation_success(
  connection: api.IConnection,
): Promise<void> {
  // Scenario 1: Successfully create an administrator request by an authenticated administrator user.
  // 1. Administrator joins and authenticates
  const adminConnection: api.IConnection = { host: connection.host };
  // Use authorize_administrator_join utility function to join administrator
  const adminAuthorized = await authorize_administrator_join(adminConnection, {
    body: {},
  });
  typia.assert(adminAuthorized);
  // Update adminConnection headers with the received authorization token
  adminConnection.headers = {
    Authorization: `Bearer ${adminAuthorized.token.access}`,
  };
  // 2. Create administrator request with valid registered_user_id and reason
  const reason = RandomGenerator.paragraph({ sentences: 3 });
  const registered_user_id = typia.random<string & tags.Format<"uuid">>();
  const createAdminRequestInput = {
    registered_user_id,
    reason,
  } satisfies IDiscussionBoardAdministratorRequest.ICreate;
  const createdRequest =
    await generate_random_discussion_board_administrator_administrator_requests_create_administrator_request(
      adminConnection,
      {
        body: createAdminRequestInput,
      },
    );
  typia.assert(createdRequest);
  // Cast to any to access properties that may not be typed on IDiscussionBoardAdministratorRequest
  const createdRequestAny = createdRequest as any;
  // Validate returned request info
  TestValidator.equals("status is pending", createdRequestAny.status, "pending");
  TestValidator.predicate(
    "created_at is ISO string",
    typeof createdRequestAny.created_at === "string" &&
      /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}(?:\.[0-9]+)?Z$/.test(
        createdRequestAny.created_at,
      ),
  );
  TestValidator.predicate(
    "updated_at is ISO string",
    typeof createdRequestAny.updated_at === "string" &&
      /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}(?:\.[0-9]+)?Z$/.test(
        createdRequestAny.updated_at,
      ),
  );
  TestValidator.predicate(
    "updated_at is equal or after created_at",
    new Date(createdRequestAny.updated_at).getTime() >=
      new Date(createdRequestAny.created_at).getTime(),
  );
  TestValidator.equals(
    "registered_user_id matches input",
    createdRequestAny.registered_user_id,
    registered_user_id,
  );
}
