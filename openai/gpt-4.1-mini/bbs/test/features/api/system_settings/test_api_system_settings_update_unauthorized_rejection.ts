import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdministrator";
import type { IDiscussionBoardSystemSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSystemSetting";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_administrator_join } from "../../../authorize/authorize_super_administrator_join";
import { authorize_super_administrator_login } from "../../../authorize/authorize_super_administrator_login";
import { authorize_super_administrator_refresh } from "../../../authorize/authorize_super_administrator_refresh";

export async function test_api_system_settings_update_unauthorized_rejection(
  connection: api.IConnection,
): Promise<void> {
  // 1. Prepare a superAdministrator user by joining (to fulfill precondition)
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdminAuthorized = await authorize_super_administrator_join(
    superAdminConnection,
    {
      body: {
        email: typia.random<string & typia.tags.Format<"email">>(),
        password: "super-secure-password-123",
        href: typia.random<string & typia.tags.Format<"uri">>(),
        referrer: typia.random<string & typia.tags.Format<"uri">>(),
        ip: null,
      },
    },
  );
  // We must NOT use superAdminConnection or any authorization connection
  // to test unauthorized rejection. Use base connection directly.
  // 2. Attempt to PATCH system settings update without authorization header
  // Expecting HTTP 403 Forbidden error
  // Construct random update body
  const updateBody: IDiscussionBoardSystemSetting.IUpdate = {
    key: "test_unauthorized_key",
    value: "new_value",
    description: "This update should be rejected due to lack of authorization",
    deleted_at: null,
  };
  await TestValidator.httpError(
    "unauthorized update rejected with HTTP 403 status",
    403,
    async () => {
      // Attempt update with base connection (no auth)
      await api.functional.discussionBoard.superAdministrator.systemSettings.updateSettings(
        connection,
        {
          body: updateBody,
        },
      );
    },
  );
}
