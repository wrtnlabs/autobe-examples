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

export async function test_api_system_setting_retrieval_success_super_administrator(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as super administrator using join utility
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdmin = await authorize_super_administrator_join(
    superAdminConnection,
    {},
  );
  superAdminConnection.headers = Object.assign(
    {},
    superAdminConnection.headers,
    {
      Authorization: superAdmin.token.access,
    },
  );
  // We must get an existing system setting ID, but no creation endpoint is available.
  // So we use a simulated random system setting to test retrieval.
  const systemSettingId = typia.random<string & tags.Format<"uuid">>();
  // 2. Retrieve the system setting by ID with authorized super administrator connection
  const output =
    await api.functional.discussionBoard.superAdministrator.systemSettings.atSystemSetting(
      superAdminConnection,
      { id: systemSettingId },
    );
  await typia.assert(output);
  // 3. Validate output fields
  TestValidator.equals(
    "system setting id matches requested id",
    output.id,
    systemSettingId,
  );
  TestValidator.predicate(
    "system setting has non-empty key",
    output.key.length > 0,
  );
  TestValidator.predicate(
    "system setting has non-empty value",
    output.value.length > 0,
  );
  TestValidator.predicate(
    "description is string or null",
    output.description === null || typeof output.description === "string",
  );
  TestValidator.predicate(
    "createdAt is valid date-time",
    !isNaN(Date.parse(output.created_at)),
  );
  TestValidator.predicate(
    "updatedAt is valid date-time",
    !isNaN(Date.parse(output.updated_at)),
  );
  TestValidator.predicate(
    "deletedAt is null or valid date-time",
    output.deleted_at === null || !isNaN(Date.parse(output.deleted_at)),
  );
  // 4. Test unauthorized access throws error
  await TestValidator.httpError(
    "throws 401 unauthorized without token",
    401,
    async () =>
      await api.functional.discussionBoard.superAdministrator.systemSettings.atSystemSetting(
        connection,
        { id: systemSettingId },
      ),
  );
}
