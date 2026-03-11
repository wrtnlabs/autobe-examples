import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardSystemConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSystemConfiguration";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { generate_random_discussion_board_admin_system_configurations_create } from "../../../generate/generate_random_discussion_board_admin_system_configurations_create";
import { prepare_random_discussion_board_system_configuration } from "../../../prepare/prepare_random_discussion_board_system_configuration";

export async function test_api_system_configuration_create_different_data_types(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  // Test string data type
  const stringConfig =
    await api.functional.discussionBoard.admin.system_configurations.create(
      adminConnection,
      {
        body: {
          key: "app.name",
          value: "Discussion Board",
          data_type: "string",
          description: "Application display name",
        } satisfies IDiscussionBoardSystemConfiguration.ICreate,
      },
    );
  typia.assert(stringConfig);
  TestValidator.equals("string data type", stringConfig.data_type, "string");
  TestValidator.equals("string value", stringConfig.value, "Discussion Board");
  // Test integer data type
  const integerConfig =
    await api.functional.discussionBoard.admin.system_configurations.create(
      adminConnection,
      {
        body: {
          key: "articles.per_page",
          value: "25",
          data_type: "integer",
          description: "Number of articles per page",
        } satisfies IDiscussionBoardSystemConfiguration.ICreate,
      },
    );
  typia.assert(integerConfig);
  TestValidator.equals("integer data type", integerConfig.data_type, "integer");
  TestValidator.equals("integer value", integerConfig.value, "25");
  // Test boolean data type
  const booleanConfig =
    await api.functional.discussionBoard.admin.system_configurations.create(
      adminConnection,
      {
        body: {
          key: "features.comments",
          value: "true",
          data_type: "boolean",
          description: "Enable comment functionality",
        } satisfies IDiscussionBoardSystemConfiguration.ICreate,
      },
    );
  typia.assert(booleanConfig);
  TestValidator.equals("boolean data type", booleanConfig.data_type, "boolean");
  TestValidator.equals("boolean value", booleanConfig.value, "true");
  // Test json data type
  const jsonConfig =
    await api.functional.discussionBoard.admin.system_configurations.create(
      adminConnection,
      {
        body: {
          key: "ui.theme",
          value: '{"primary": "#3498db", "secondary": "#2ecc71"}',
          data_type: "json",
          description: "UI theme configuration",
        } satisfies IDiscussionBoardSystemConfiguration.ICreate,
      },
    );
  typia.assert(jsonConfig);
  TestValidator.equals("json data type", jsonConfig.data_type, "json");
  TestValidator.equals(
    "json value",
    jsonConfig.value,
    '{"primary": "#3498db", "secondary": "#2ecc71"}',
  );
  // Test datetime data type
  const datetimeConfig =
    await api.functional.discussionBoard.admin.system_configurations.create(
      adminConnection,
      {
        body: {
          key: "maintenance.start",
          value: new Date().toISOString(),
          data_type: "datetime",
          description: "Maintenance window start time",
        } satisfies IDiscussionBoardSystemConfiguration.ICreate,
      },
    );
  typia.assert(datetimeConfig);
  TestValidator.equals(
    "datetime data type",
    datetimeConfig.data_type,
    "datetime",
  );
  // Test uri data type
  const uriConfig =
    await api.functional.discussionBoard.admin.system_configurations.create(
      adminConnection,
      {
        body: {
          key: "api.documentation",
          value: "https://api.example.com/docs",
          data_type: "uri",
          description: "API documentation URL",
        } satisfies IDiscussionBoardSystemConfiguration.ICreate,
      },
    );
  typia.assert(uriConfig);
  TestValidator.equals("uri data type", uriConfig.data_type, "uri");
  TestValidator.equals(
    "uri value",
    uriConfig.value,
    "https://api.example.com/docs",
  );
}
