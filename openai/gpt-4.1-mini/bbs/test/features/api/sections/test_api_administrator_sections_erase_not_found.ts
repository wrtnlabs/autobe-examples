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

export async function test_api_administrator_sections_erase_not_found(
  connection: api.IConnection,
): Promise<void> {
  // This test scenario validates the behavior when an authenticated administrator attempts to delete a non-existent discussion board section identified by an invalid or missing sectionId UUID. It expects the operation to respond with HTTP 404 Not Found status and maintain system consistency. Proper error responses must be handled correctly and no changes should occur in the system.
  // 1. Authenticate as administrator with join
  const adminConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_administrator_join(adminConnection, {
    body: {},
  });
  typia.assert(authorized);
  // 2. Admin connection now has authorization token internally set
  // 3. Attempt to delete a non-existent section with a random UUID
  const nonExistentSectionId = typia.random<string & tags.Format<"uuid">>();
  // 4. Expect 404 error on deletion attempt
  await TestValidator.httpError(
    "delete non-existent section returns 404",
    404,
    async () => {
      await api.functional.discussionBoard.administrator.sections.erase(
        adminConnection,
        {
          sectionId: nonExistentSectionId,
        },
      );
    },
  );
}
