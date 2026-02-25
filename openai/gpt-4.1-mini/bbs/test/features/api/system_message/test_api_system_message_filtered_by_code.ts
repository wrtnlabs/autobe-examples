import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdministrator";
import type { IDiscussionBoardSystemMessage } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSystemMessage";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardSystemMessage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardSystemMessage";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_administrator_join } from "../../../authorize/authorize_super_administrator_join";
import { authorize_super_administrator_login } from "../../../authorize/authorize_super_administrator_login";
import { authorize_super_administrator_refresh } from "../../../authorize/authorize_super_administrator_refresh";

export async function test_api_system_message_filtered_by_code(
  connection: api.IConnection,
): Promise<void> {
  // 1. Super administrator sign up
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdminAuth = await authorize_super_administrator_join(
    superAdminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: null,
      },
    },
  );
  typia.assert(superAdminAuth);
  // Prepare authorized connection
  const authorizedConnection: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: `Bearer ${superAdminAuth.token.access}`,
    },
  };
  // 2. Retrieve all system messages to pick one code for filtering
  const allMessagesResponse =
    await api.functional.discussionBoard.superAdministrator.systemMessages.index(
      authorizedConnection,
      { body: {} },
    );
  typia.assert(allMessagesResponse);
  const messages = allMessagesResponse.data;
  // Must have at least one message to test filtering
  if (messages.length === 0)
    throw new Error("No system messages available to test filtering.");
  const messageToFilter = messages[0];
  // 3. Request filtering by exact code
  const filteredResponse =
    await api.functional.discussionBoard.superAdministrator.systemMessages.index(
      authorizedConnection,
      {
        body: {
          code: messageToFilter.code,
          page: 1,
          limit: 10,
        },
      },
    );
  typia.assert(filteredResponse);
  // 4. Validate all returned messages have the exact same code
  filteredResponse.data.forEach((msg) => {
    TestValidator.equals(
      "code matches filtered code",
      msg.code,
      messageToFilter.code,
    );
  });
  // 5. Pagination metadata check
  TestValidator.predicate(
    "pagination current page is 1",
    filteredResponse.pagination.current === 1,
  );
  TestValidator.predicate(
    "pagination limit is 10",
    filteredResponse.pagination.limit === 10,
  );
  TestValidator.predicate(
    "pagination records is not less than returned data length",
    filteredResponse.pagination.records >= filteredResponse.data.length,
  );
  TestValidator.predicate(
    "pagination pages is >= 0",
    filteredResponse.pagination.pages >= 0,
  );
  // 6. Authorization enforcement test: try without token
  const unauthorizedConnection: api.IConnection = { host: connection.host }; // no headers
  await TestValidator.httpError(
    "unauthorized access rejects requests",
    401,
    async () => {
      await api.functional.discussionBoard.superAdministrator.systemMessages.index(
        unauthorizedConnection,
        { body: { code: messageToFilter.code } },
      );
    },
  );
}
