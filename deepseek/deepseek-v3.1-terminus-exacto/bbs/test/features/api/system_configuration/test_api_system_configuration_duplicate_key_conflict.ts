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

/**
 * Test conflict scenario when attempting to create a configuration with a duplicate key.
 * As a super administrator, authenticate via superAdmin join first.
 * Within the test implementation, create an initial configuration with a specific key to establish it in the system.
 * Then attempt to create another configuration using the same exact key.
 * Validate that the system properly enforces key uniqueness and returns an appropriate conflict error (409 or similar).
 * This tests the business logic that prevents configuration conflicts and ensures each platform setting has a unique identifier.
 * This is NOT input validation testing - it's testing the business rule enforcement of unique configuration keys,
 * which is essential for platform stability and prevents configuration collisions.
 */
export async function test_api_system_configuration_duplicate_key_conflict(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as super administrator using utility function
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    },
  });
  // 2. Create first configuration with a unique key
  const key = RandomGenerator.alphabets(8) + "." + RandomGenerator.alphabets(6);
  const dataType = RandomGenerator.pick([
    "string",
    "integer",
    "boolean",
    "json",
    "datetime",
    "uri",
  ] as const);
  const value =
    dataType === "string"
      ? RandomGenerator.paragraph({ sentences: 2 })
      : dataType === "integer"
        ? typia.random<number & tags.Type<"int32">>().toString()
        : dataType === "boolean"
          ? "true"
          : dataType === "json"
            ? '{"example": "data"}'
            : dataType === "datetime"
              ? new Date().toISOString()
              : "https://example.com";
  const firstConfig =
    await generate_random_discussion_board_super_admin_system_configurations_create(
      superAdminConnection,
      {
        body: {
          key,
          value,
          data_type: dataType,
          description: RandomGenerator.paragraph({ sentences: 3 }),
        },
      },
    );
  typia.assert(firstConfig);
  // 3. Attempt to create duplicate configuration with same key
  await TestValidator.httpError(
    "duplicate system configuration key should conflict",
    409,
    async () =>
      await generate_random_discussion_board_super_admin_system_configurations_create(
        superAdminConnection,
        {
          body: {
            key,
            value: RandomGenerator.paragraph({ sentences: 1 }),
            data_type: RandomGenerator.pick([
              "string",
              "integer",
              "boolean",
              "json",
              "datetime",
              "uri",
            ] as const),
            description: RandomGenerator.paragraph({ sentences: 2 }),
          },
        },
      ),
  );
}
