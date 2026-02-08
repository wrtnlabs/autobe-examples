import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrator";
import type { IDiscussionBoardSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdministrator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_administrator_join } from "../../../authorize/authorize_super_administrator_join";
import { authorize_super_administrator_login } from "../../../authorize/authorize_super_administrator_login";
import { authorize_super_administrator_refresh } from "../../../authorize/authorize_super_administrator_refresh";

export async function test_api_administrator_promotion_nonexistent_administrator(
  connection: api.IConnection,
): Promise<void> {
  // This test scenario verifies the system behavior when attempting to promote a non-existent administrator.
  // It confirms that the operation gracefully handles the error, returning appropriate HTTP status and message.
  // 1. Setup super administrator authorization
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdminAuth = await authorize_super_administrator_join(
    superAdminConnection,
    {
      body: {}, // No properties required in IJoin
    },
  );
  superAdminConnection.headers = {
    Authorization: `Bearer ${superAdminAuth.token.access}`,
  };
  // 2. Attempt to promote a non-existent administrator with a random UUID
  const fakeAdministratorId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.httpError(
    "promote non-existent administrator should fail with 404",
    404,
    async () => {
      await api.functional.discussionBoard.superAdministrator.administrators.promote(
        superAdminConnection,
        {
          administratorId: fakeAdministratorId,
        },
      );
    },
  );
}
