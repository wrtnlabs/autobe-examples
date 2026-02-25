import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrator";
import type { IDiscussionBoardAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorGrade";
import type { IDiscussionBoardSystemSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSystemSetting";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_system_setting_retrieve_existing_by_administrator(
  connection: api.IConnection,
): Promise<void> {
  // Administrator registration and login
  const adminConnection: api.IConnection = { host: connection.host };
  const authAdmin = await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "securePa$$w0rd",
    },
  });
  typia.assert(authAdmin);
  adminConnection.headers = {
    Authorization: authAdmin.token.access,
  };
  // NOTE: The system does not provide an API to create or list system settings,
  // so we use a random UUID as an existing system setting ID for the test.
  // In a real environment, this should be replaced with a pre-created valid ID.
  const existingSystemSettingId = typia.random<string & tags.Format<"uuid">>();
  // Retrieve the existing system setting by ID
  const systemSetting =
    await api.functional.discussionBoard.administrator.systemSettings.atSystemSetting(
      adminConnection,
      { id: existingSystemSettingId },
    );
  typia.assert(systemSetting);
  // Assert response properties
  TestValidator.predicate(
    "id is uuid",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      systemSetting.id,
    ),
  );
  TestValidator.predicate(
    "key is non-empty string",
    typeof systemSetting.key === "string" && systemSetting.key.length > 0,
  );
  TestValidator.predicate(
    "value is string",
    typeof systemSetting.value === "string",
  );
  TestValidator.predicate(
    "description is string or null",
    systemSetting.description === null ||
      typeof systemSetting.description === "string",
  );
  TestValidator.predicate(
    "created_at is date-time string",
    /^[0-9]{4}-(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9](?:\.[0-9]+)?Z$/i.test(
      systemSetting.created_at,
    ),
  );
  TestValidator.predicate(
    "updated_at is date-time string",
    /^[0-9]{4}-(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9](?:\.[0-9]+)?Z$/i.test(
      systemSetting.updated_at,
    ),
  );
  TestValidator.predicate(
    "deleted_at is date-time string or null",
    systemSetting.deleted_at === null ||
      /^[0-9]{4}-(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9](?:\.[0-9]+)?Z$/i.test(
        systemSetting.deleted_at,
      ),
  );
}
