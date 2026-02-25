import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdministrator";
import type { IDiscussionBoardSystemMessage } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSystemMessage";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_administrator_join } from "../../../authorize/authorize_super_administrator_join";
import { authorize_super_administrator_login } from "../../../authorize/authorize_super_administrator_login";
import { authorize_super_administrator_refresh } from "../../../authorize/authorize_super_administrator_refresh";

export async function test_api_system_message_retrieval_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create actor-specific connection and authorize as super administrator
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdmin = await authorize_super_administrator_join(
    superAdminConnection,
    { body: undefined },
  );
  // 2. Call the systemMessages.at endpoint with a random system message ID
  try {
    const systemMessage =
      await api.functional.discussionBoard.superAdministrator.systemMessages.at(
        superAdminConnection,
        { id: typia.random<string & tags.Format<"uuid">>() },
      );
    typia.assertEquals(systemMessage);
  } catch (error) {
    throw new Error(
      `Failed to retrieve system message with status: ${error instanceof Error && "status" in error ? (error as any).status : "unknown"}`,
    );
  }
}
