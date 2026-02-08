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

export async function test_api_super_administrator_system_messages_retrieve_pagination_filtering(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as super administrator
  const superAdminConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_super_administrator_join(
    superAdminConnection,
    {
      body: {},
    },
  );
  superAdminConnection.headers = {
    Authorization: `Bearer ${authorized.token.access}`,
  };
  // 2. Test without filters (retrieve all active system messages)
  const allMessages =
    await api.functional.discussionBoard.superAdministrator.systemMessages.index(
      superAdminConnection,
      {
        body: {} satisfies IDiscussionBoardSystemMessage.IRequest,
      },
    );
  typia.assert(allMessages);
  // Validate pagination object
  TestValidator.predicate(
    "pagination current positive",
    allMessages.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination limit nonnegative",
    allMessages.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "pagination pages nonnegative",
    allMessages.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "pagination records nonnegative",
    allMessages.pagination.records >= 0,
  );
  // Validate data is an array
  TestValidator.predicate("data is array", Array.isArray(allMessages.data));
}
