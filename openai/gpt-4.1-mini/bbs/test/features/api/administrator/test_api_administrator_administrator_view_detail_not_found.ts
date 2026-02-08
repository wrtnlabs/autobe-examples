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

export async function test_api_administrator_administrator_view_detail_not_found(
  connection: api.IConnection,
): Promise<void> {
  // Create administrator connection and authorize join
  const adminConnection: api.IConnection = { host: connection.host };
  // Use utility function to join and authorize administrator
  const authorized = await authorize_administrator_join(adminConnection, {
    body: typia.random<IDiscussionBoardAdministrator.IJoin>(),
  });
  // Set authorization token in adminConnection
  adminConnection.headers = { Authorization: authorized.token.access };
  // Generate random UUID which presumably does not exist
  const nonExistentId = typia.random<string & tags.Format<"uuid">>();
  // Attempt to get administrator details with nonexistent ID, expect 404 error
  await TestValidator.httpError(
    "Administrator detail not found",
    404,
    async () => {
      await api.functional.discussionBoard.administrator.administrators.at(
        adminConnection,
        {
          id: nonExistentId,
        },
      );
    },
  );
}
