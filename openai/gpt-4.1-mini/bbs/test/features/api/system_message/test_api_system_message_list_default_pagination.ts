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

export async function test_api_system_message_list_default_pagination(
  connection: api.IConnection,
): Promise<void> {
  // SuperAdmin authorization
  const superAdminAuthorized = await authorize_super_administrator_join(
    { host: connection.host },
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
  const superAdminConnection: api.IConnection = {
    host: connection.host,
    headers: { Authorization: superAdminAuthorized.token.access },
  };
  // No filters, no pagination parameters
  const requestBody: IDiscussionBoardSystemMessage.IRequest = {};
  // Call system messages index API
  const systemMessages =
    await api.functional.discussionBoard.superAdministrator.systemMessages.index(
      superAdminConnection,
      { body: requestBody },
    );
  typia.assert(systemMessages);
  // Validate pagination fields
  TestValidator.predicate(
    "pagination current page is 1 or more",
    systemMessages.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination limit is positive",
    systemMessages.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination records is non-negative",
    systemMessages.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is non-negative",
    systemMessages.pagination.pages >= 0,
  );
  // Validate each system message summary fields
  for (const message of systemMessages.data) {
    typia.assert(message);
    TestValidator.predicate(
      "code is non-empty string",
      message.code.length > 0,
    );
    TestValidator.predicate(
      "messageText is non-empty string",
      message.messageText.length > 0,
    );
    TestValidator.predicate(
      "messageType is non-empty string",
      message.messageType.length > 0,
    );
  }
}
