import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardStatusType } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardStatusType";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import type { IDiscussionBoardSystemMetadatum } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSystemMetadatum";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";
import { generate_random_discussion_board_super_admin_system_metadata_create } from "../../../generate/generate_random_discussion_board_super_admin_system_metadata_create";
import { prepare_random_discussion_board_system_metadatum } from "../../../prepare/prepare_random_discussion_board_system_metadatum";

export async function test_api_system_metadata_create_global_boolean(
  connection: api.IConnection,
): Promise<void> {
  // Create super admin connection
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  // Create first global boolean configuration
  const config1 =
    await generate_random_discussion_board_super_admin_system_metadata_create(
      superAdminConnection,
      {
        body: {
          name: "feature_flag_enabled",
          value: "true",
          data_type: "boolean",
          scope: "global",
          description: "Test feature flag configuration",
        } satisfies IDiscussionBoardSystemMetadatum.ICreate,
      },
    );
  typia.assert(config1);
  // Validate business logic fields
  TestValidator.equals("version starts at 1", config1.version, 1);
  TestValidator.equals("deleted_at is null", config1.deleted_at, null);
  TestValidator.equals(
    "name matches input",
    config1.name,
    "feature_flag_enabled",
  );
  TestValidator.equals("value matches input", config1.value, "true");
  TestValidator.equals("data_type matches input", config1.data_type, "boolean");
  TestValidator.equals("scope matches input", config1.scope, "global");
  TestValidator.equals(
    "description matches input",
    config1.description,
    "Test feature flag configuration",
  );
  // Test uniqueness constraint - should fail when creating duplicate name+scope
  await TestValidator.error("duplicate name+scope should fail", async () => {
    await generate_random_discussion_board_super_admin_system_metadata_create(
      superAdminConnection,
      {
        body: {
          name: "feature_flag_enabled",
          value: "false",
          data_type: "boolean",
          scope: "global",
          description: "Duplicate configuration",
        } satisfies IDiscussionBoardSystemMetadatum.ICreate,
      },
    );
  });
  // Create another valid boolean configuration with different scope
  const config2 =
    await generate_random_discussion_board_super_admin_system_metadata_create(
      superAdminConnection,
      {
        body: {
          name: "feature_flag_enabled",
          value: "false",
          data_type: "boolean",
          scope: "production",
          description: "Same name but different scope",
        } satisfies IDiscussionBoardSystemMetadatum.ICreate,
      },
    );
  typia.assert(config2);
  TestValidator.equals(
    "different scope allows same name",
    config2.name,
    "feature_flag_enabled",
  );
  TestValidator.equals("scope is different", config2.scope, "production");
  TestValidator.notEquals("IDs should be different", config1.id, config2.id);
}
