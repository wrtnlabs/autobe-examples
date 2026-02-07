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

export async function test_api_system_configuration_retrieval_by_super_admin(
  connection: api.IConnection,
): Promise<void> {
  // Create super admin connection and authenticate
  const superAdminConnection: api.IConnection = { host: connection.host };
  const authResult = await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      privilege_level: "super_admin",
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  typia.assert(authResult);
  // NOTE: In a real scenario, we would need to first create a system configuration
  // to have a valid configurationId to retrieve. Since the creation endpoint is not
  // available in the provided API functions, we'll use a realistic approach.
  // For this test, we'll assume there's at least one existing configuration
  // and use a pattern that would work with a pre-populated database
  const configurationId = typia.random<string & tags.Format<"uuid">>();
  // Attempt to retrieve the configuration
  const configuration =
    await api.functional.discussionBoard.superAdmin.system_configurations.at(
      superAdminConnection,
      { configurationId },
    );
  typia.assert(configuration);
  // Validate the configuration structure - typia.assert() already validates types
  // so we only need to validate business logic aspects
  TestValidator.equals(
    "configuration id matches",
    configuration.id,
    configurationId,
  );
  // Validate that sensitive configuration values are returned in plain text
  if (configuration.is_sensitive) {
    TestValidator.predicate(
      "sensitive value is accessible",
      configuration.config_value.length > 0,
    );
  }
  // Validate timestamp formats are valid ISO strings
  TestValidator.predicate(
    "created_at is valid ISO string",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/.test(
      configuration.created_at,
    ),
  );
  TestValidator.predicate(
    "updated_at is valid ISO string",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/.test(
      configuration.updated_at,
    ),
  );
  // Validate deleted_at is either null or valid ISO string
  if (configuration.deleted_at !== null) {
    TestValidator.predicate(
      "deleted_at is valid ISO string",
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/.test(
        configuration.deleted_at,
      ),
    );
  }
}
