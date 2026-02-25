import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
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

export async function test_api_system_message_erase_authorization_required(
  connection: api.IConnection,
): Promise<void> {
  // Test that only a superAdministrator can delete system messages.
  // 1) Attempt the DELETE operation as an unauthenticated user and verify authorization failure (401 or 403).
  // 2) Attempt the deletion as a different actor role if applicable (e.g., regular administrator) and verify authorization failure.
  // 3) Authenticate as superAdministrator via join endpoint and perform a successful deletion to confirm authorization necessity.
  // 1. Unauthenticated attempt
  const unauthenticatedConnection: api.IConnection = { host: connection.host };
  await TestValidator.httpError(
    "unauthorized deletion attempt unauthenticated user",
    [401, 403],
    async () => {
      await api.functional.discussionBoard.superAdministrator.systemMessages.erase(
        unauthenticatedConnection,
        {
          id: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );
  // 2. Attempt deletion by other actor role - since no other actor login utilities are provided, skip this step.
  // Spec says if applicable, thus no other role test.
  // 3. Authenticate as superAdministrator and perform a successful deletion
  const superAdminConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_super_administrator_join(
    superAdminConnection,
    {},
  );
  superAdminConnection.headers ??= {};
  superAdminConnection.headers.Authorization = authorized.token.access;
  // Perform delete operation
  await api.functional.discussionBoard.superAdministrator.systemMessages.erase(
    superAdminConnection,
    {
      id: typia.random<string & tags.Format<"uuid">>(),
    },
  );
}
