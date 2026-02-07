import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import type { IDiscussionBoardSystemConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSystemConfiguration";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";
import { generate_random_discussion_board_super_admin_system_configurations_create } from "../../../generate/generate_random_discussion_board_super_admin_system_configurations_create";
import { prepare_random_discussion_board_system_configuration } from "../../../prepare/prepare_random_discussion_board_system_configuration";

export async function test_api_system_configuration_sensitive_data(
  connection: api.IConnection,
): Promise<void> {
  // Create super admin connection
  const superAdminConnection: api.IConnection = { host: connection.host };
  // Authenticate as super administrator
  const superAdmin = await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      privilege_level: "super_admin",
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  typia.assert(superAdmin);
  // Create sensitive configuration parameter
  const sensitiveConfig =
    await generate_random_discussion_board_super_admin_system_configurations_create(
      superAdminConnection,
      {
        body: {
          config_key: RandomGenerator.alphabets(10),
          config_value: RandomGenerator.alphabets(20),
          data_type: "string",
          description: RandomGenerator.paragraph({ sentences: 2 }),
          category: "security",
          is_sensitive: true,
        } satisfies IDiscussionBoardSystemConfiguration.ICreate,
      },
    );
  typia.assert(sensitiveConfig);
  // Validate sensitive configuration properties
  TestValidator.equals(
    "sensitive config is_sensitive flag",
    sensitiveConfig.is_sensitive,
    true,
  );
  TestValidator.equals(
    "sensitive config category",
    sensitiveConfig.category,
    "security",
  );
  // Create regular configuration parameter
  const regularConfig =
    await generate_random_discussion_board_super_admin_system_configurations_create(
      superAdminConnection,
      {
        body: {
          config_key: RandomGenerator.alphabets(12),
          config_value: typia
            .random<
              number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<100>
            >()
            .toString(),
          data_type: "integer",
          description: RandomGenerator.paragraph({ sentences: 2 }),
          category: "authentication",
          is_sensitive: false,
        } satisfies IDiscussionBoardSystemConfiguration.ICreate,
      },
    );
  typia.assert(regularConfig);
  // Validate regular configuration properties
  TestValidator.equals(
    "regular config is_sensitive flag",
    regularConfig.is_sensitive,
    false,
  );
  TestValidator.equals(
    "regular config category",
    regularConfig.category,
    "authentication",
  );
  // Validate that configurations have different IDs
  TestValidator.notEquals(
    "config IDs should differ",
    sensitiveConfig.id,
    regularConfig.id,
  );
  // Validate business logic: sensitive config should have security category
  TestValidator.predicate(
    "sensitive config belongs to security category",
    sensitiveConfig.category === "security",
  );
  // Validate business logic: regular config can have different categories
  TestValidator.predicate(
    "regular config has valid category",
    regularConfig.category === "authentication",
  );
}
