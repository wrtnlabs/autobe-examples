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

export async function test_api_system_configuration_create_string_type(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate administrator connection
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  typia.assert(admin);
  // 2. Create string-type system configuration
  const configKey = `test.string.config.${Date.now()}`;
  const configBody = {
    config_key: configKey,
    config_value: RandomGenerator.paragraph({ sentences: 2 }),
    data_type: "string" as const,
    description: RandomGenerator.content({ paragraphs: 1 }),
    category: RandomGenerator.pick([
      "authentication",
      "content",
      "performance",
      "security",
    ] as const),
    is_sensitive: false,
  } satisfies IDiscussionBoardSystemConfiguration.ICreate;
  const config =
    await api.functional.discussionBoard.admin.system_configurations.create(
      adminConnection,
      { body: configBody },
    );
  typia.assert(config);
  // 3. Validate configuration response
  TestValidator.equals(
    "config_key matches input",
    config.config_key,
    configBody.config_key,
  );
  TestValidator.equals(
    "config_value matches input",
    config.config_value,
    configBody.config_value,
  );
  TestValidator.equals("data_type is string", config.data_type, "string");
  TestValidator.equals(
    "description matches input",
    config.description,
    configBody.description,
  );
  TestValidator.equals(
    "category matches input",
    config.category,
    configBody.category,
  );
  TestValidator.equals(
    "is_sensitive matches input",
    config.is_sensitive,
    configBody.is_sensitive,
  );
  // 4. Validate system-generated fields (business logic only)
  TestValidator.equals(
    "deleted_at is null for active config",
    config.deleted_at,
    null,
  );
}
