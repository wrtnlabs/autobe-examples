import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrator";
import type { IDiscussionBoardAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorGrade";
import type { IDiscussionBoardSystemMessage } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSystemMessage";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardSystemMessage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardSystemMessage";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_system_messages_index_without_filters_authorized_admin(
  connection: api.IConnection,
): Promise<void> {
  // Test retrieving system messages as an authorized administrator with no filters.
  // Verify the response includes paginated list of system messages with correct pagination metadata.
  // Validate that each message has a valid id, code, messageText, and messageType.
  // Confirm HTTP 200 response and authorization tokens are valid.
  // 1. Administrator join and authorization
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuthorized = await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "StrongPass123!",
    },
  });
  typia.assert(adminAuthorized);
  adminConnection.headers = { Authorization: adminAuthorized.token.access };
  // 2. Retrieve system messages with empty filters (no code, no messageType, default pagination)
  const response =
    await api.functional.discussionBoard.administrator.systemMessages.index(
      adminConnection,
      { body: {} },
    );
  typia.assert(response);
  // 3. Validate pagination metadata
  TestValidator.predicate(
    "pagination current should be >= 1",
    response.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination limit should be >= 1",
    response.pagination.limit >= 1,
  );
  TestValidator.predicate(
    "pagination records should be >= 0",
    response.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages should be >= 0",
    response.pagination.pages >= 0,
  );
  // 4. Validate each system message item
  for (const msg of response.data) {
    // Assert all properties presence and types
    typia.assert<IDiscussionBoardSystemMessage.ISummary>(msg);
    // Additional fine validation: check if id is a valid UUID
    TestValidator.predicate(
      "system message id is valid uuid",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        msg.id,
      ),
    );
    TestValidator.predicate(
      "system message code is non-empty",
      msg.code.length > 0,
    );
    TestValidator.predicate(
      "system message messageText is non-empty",
      msg.messageText.length > 0,
    );
    TestValidator.predicate(
      "system message messageType is non-empty",
      msg.messageType.length > 0,
    );
  }
}
