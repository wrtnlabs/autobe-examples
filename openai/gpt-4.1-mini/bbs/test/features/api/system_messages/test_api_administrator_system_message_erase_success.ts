import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_administrator_system_message_erase_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as administrator by joining
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, { body: {} });
  // 2. Use a fixed valid UUID as system message template ID since creation is not available
  const systemMessageId =
    "00000000-0000-0000-0000-000000000000" satisfies string &
      tags.Format<"uuid">;
  // 3. Call DELETE API to erase system message
  await api.functional.discussionBoard.administrator.systemMessages.erase(
    adminConnection,
    { id: systemMessageId },
  );
  // 4. Success is confirmed by no error thrown and 204 No Content response
}
