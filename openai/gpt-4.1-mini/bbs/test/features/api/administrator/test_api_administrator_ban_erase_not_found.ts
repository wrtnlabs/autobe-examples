import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrator";
import type { IDiscussionBoardAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorGrade";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_administrator_ban_erase_not_found(
  connection: api.IConnection,
): Promise<void> {
  // This scenario tests the case where an administrator attempts to delete a ban record that does not exist.
  // After administrator registration, the test tries to delete a ban by specifying a banId that is not in the database.
  // It expects an appropriate error response indicating the ban record was not found, thus verifying error handling for invalid banId.
  // 1. Administrator registration and authorization
  const adminConnection: api.IConnection = { host: connection.host };
  const administrator = await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "securePassword123",
    },
  });
  // Inject the received token into adminConnection headers
  adminConnection.headers ??= {};
  adminConnection.headers.Authorization = administrator.token.access;
  // 2. Attempt to erase a non-existent ban with a random UUID banId
  const fakeBanId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "should fail to erase non-existent ban",
    async () => {
      await api.functional.discussionBoard.administrator.administrator.bans.erase(
        adminConnection,
        { banId: fakeBanId },
      );
    },
  );
}
