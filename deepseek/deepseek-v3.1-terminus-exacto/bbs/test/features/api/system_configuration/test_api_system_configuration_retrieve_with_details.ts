import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
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

/**
 * Test the successful retrieval of a specific system configuration by its ID.
 */
export async function test_api_system_configuration_retrieve_with_details(
  connection: api.IConnection,
): Promise<void> {
  // Create super admin connection
  const superAdminConnection: api.IConnection = { host: connection.host };
  // Authenticate as super administrator
  const authResult = await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  typia.assert(authResult);
  // Generate a valid configuration ID
  const configurationId = typia.random<string & tags.Format<"uuid">>();
  // Retrieve the system configuration
  const configuration =
    await api.functional.discussionBoard.superAdmin.system_configurations.at(
      superAdminConnection,
      {
        configurationId,
      },
    );
  typia.assert(configuration);
  // Validate data type enum values using proper type checking
  const validDataTypes = [
    "string",
    "integer",
    "boolean",
    "number",
    "json",
  ] as const;
  TestValidator.predicate(
    "data_type is valid enum value",
    validDataTypes.some((validType) => configuration.data_type === validType),
  );
  // Validate that the returned configuration ID matches the requested one
  TestValidator.equals(
    "configuration ID matches request",
    configuration.id,
    configurationId,
  );
  // Validate deleted_at is null (only non-deleted records are returned)
  TestValidator.equals("deleted_at is null", configuration.deleted_at, null);
  // Validate sensitive configurations are not masked for super admin
  if (configuration.is_sensitive) {
    TestValidator.predicate(
      "sensitive config value is not masked",
      configuration.config_value.length > 0,
    );
  }
}
