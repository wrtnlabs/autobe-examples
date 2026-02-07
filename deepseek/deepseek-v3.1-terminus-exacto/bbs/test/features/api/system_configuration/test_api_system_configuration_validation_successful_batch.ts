import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardSystemConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSystemConfiguration";
import type { IDiscussionBoardSystemConfigurationValidationItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSystemConfigurationValidationItem";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_system_configuration_validation_successful_batch(
  connection: api.IConnection,
): Promise<void> {
  // Create administrator connection
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  // Prepare valid configuration items with different data types using proper type generation
  const configurations: IDiscussionBoardSystemConfigurationValidationItem[] = [
    {
      config_key: RandomGenerator.alphabets(10),
      data_type: "string",
      config_value: RandomGenerator.paragraph({ sentences: 1 }),
    },
    {
      config_key: RandomGenerator.alphabets(10),
      data_type: "integer",
      config_value: typia
        .random<
          number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<10000>
        >()
        .toString(),
    },
    {
      config_key: RandomGenerator.alphabets(10),
      data_type: "boolean",
      config_value: "true",
    },
    {
      config_key: RandomGenerator.alphabets(10),
      data_type: "json",
      config_value: JSON.stringify({
        setting: RandomGenerator.alphabets(5),
        value: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<100>
        >(),
      }),
    },
  ];
  // Validate the batch of configurations
  const response =
    await api.functional.discussionBoard.admin.system_configurations.validations.validate(
      adminConnection,
      {
        body: {
          configurations,
        } satisfies IDiscussionBoardSystemConfiguration.IRequest,
      },
    );
  typia.assert(response);
  // Validate overall success status
  TestValidator.equals(
    "validation status",
    response.validation_status,
    "success",
  );
  TestValidator.equals("error count", response.error_count ?? 0, 0);
  TestValidator.equals("warning count", response.warning_count ?? 0, 0);
  // Validate individual configuration results
  TestValidator.equals(
    "number of results",
    response.results.length,
    configurations.length,
  );
  for (let i = 0; i < configurations.length; i++) {
    const config = configurations[i];
    const result = response.results[i];
    TestValidator.equals(
      `config key ${i}`,
      result.config_key,
      config.config_key,
    );
    TestValidator.equals(
      `config value ${i}`,
      result.config_value,
      config.config_value,
    );
    TestValidator.equals(`data type ${i}`, result.data_type, config.data_type);
    TestValidator.equals(
      `validation status ${i}`,
      result.validation_status,
      "valid",
    );
    TestValidator.equals(
      `error messages ${i}`,
      result.error_messages.length,
      0,
    );
  }
}
