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

export async function test_api_system_configuration_create_boolean_feature_flag(
  connection: api.IConnection,
): Promise<void> {
  // Create super administrator connection
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdmin = await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    },
  });
  typia.assert(superAdmin);
  // Test 1: Create boolean feature flag with value "true"
  const booleanTrueConfig =
    await generate_random_discussion_board_super_admin_system_configurations_create(
      superAdminConnection,
      {
        body: {
          key: "features.moderation.enabled",
          value: "true",
          data_type: "boolean",
          description:
            "Enables moderation features for content review and approval workflow",
        },
      },
    );
  typia.assert(booleanTrueConfig);
  TestValidator.equals(
    "key matches",
    booleanTrueConfig.key,
    "features.moderation.enabled",
  );
  TestValidator.equals("value matches true", booleanTrueConfig.value, "true");
  TestValidator.equals(
    "data_type boolean",
    booleanTrueConfig.data_type,
    "boolean",
  );
  TestValidator.predicate(
    "has uuid format",
    /^[0-9a-f-]{36}$/i.test(booleanTrueConfig.id),
  );
  TestValidator.predicate(
    "created_at is ISO date",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(booleanTrueConfig.created_at),
  );
  TestValidator.predicate(
    "updated_at is ISO date",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(booleanTrueConfig.updated_at),
  );
  // Test 2: Create boolean feature flag with value "false"
  const booleanFalseConfig =
    await generate_random_discussion_board_super_admin_system_configurations_create(
      superAdminConnection,
      {
        body: {
          key: "features.reporting.detailed_logs",
          value: "false",
          data_type: "boolean",
          description:
            "Controls whether detailed reporting logs are generated (may impact performance)",
        },
      },
    );
  typia.assert(booleanFalseConfig);
  TestValidator.equals(
    "key matches false config",
    booleanFalseConfig.key,
    "features.reporting.detailed_logs",
  );
  TestValidator.equals(
    "value matches false",
    booleanFalseConfig.value,
    "false",
  );
  TestValidator.equals(
    "data_type boolean false",
    booleanFalseConfig.data_type,
    "boolean",
  );
  // Test 3: Create boolean feature flag with null value (optional)
  const booleanNullConfig =
    await generate_random_discussion_board_super_admin_system_configurations_create(
      superAdminConnection,
      {
        body: {
          key: "features.experimental.ab_testing",
          value: null,
          data_type: "boolean",
          description:
            "Experimental A/B testing feature toggle for gradual rollout capabilities",
        },
      },
    );
  typia.assert(booleanNullConfig);
  TestValidator.equals(
    "key matches null config",
    booleanNullConfig.key,
    "features.experimental.ab_testing",
  );
  TestValidator.equals("value is null", booleanNullConfig.value, null);
  TestValidator.equals(
    "data_type boolean null",
    booleanNullConfig.data_type,
    "boolean",
  );
  // Test 4: Validate business logic - boolean values should only accept "true", "false", or null
  TestValidator.equals(
    "true config admin grade",
    superAdmin.admin_grade,
    "super",
  );
}
