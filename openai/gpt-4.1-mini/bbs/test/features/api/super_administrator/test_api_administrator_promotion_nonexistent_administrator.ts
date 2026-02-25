import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrator";
import type { IDiscussionBoardAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorGrade";
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
  // Scenario: Attempt to promote a non-existent administrator ID by a super administrator. Expect an error indicating the administrator does not exist.
  // 1. Authenticate as super administrator by joining
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdmin = await authorize_super_administrator_join(
    superAdminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "1234",
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: null,
      },
    },
  );
  superAdminConnection.headers = {
    ...superAdminConnection.headers,
    Authorization: `Bearer ${superAdmin.token.access}`,
  };
  // 2. Use a random administrator ID that does not exist
  const nonExistentAdminId = typia.random<string & tags.Format<"uuid">>();
  // 3. Attempt to promote the non-existent administrator and expect an error
  await TestValidator.error(
    "promotion fails for non-existent administrator",
    async () => {
      await api.functional.discussionBoard.superAdministrator.administrator.promote.promoteAdministrator(
        superAdminConnection,
        { administratorId: nonExistentAdminId },
      );
    },
  );
}
