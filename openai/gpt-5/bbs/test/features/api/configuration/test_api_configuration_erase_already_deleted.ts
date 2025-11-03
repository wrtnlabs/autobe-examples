import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICivicBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICivicBoardAdmin";
import type { ICivicBoardAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICivicBoardAdminJoin";
import type { ICivicBoardConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/ICivicBoardConfiguration";

/**
 * Delete-once then confirm repeated deletion fails for configurations.
 *
 * Purpose:
 *
 * - Ensure configuration erase endpoint is NOT idempotent for already-deleted
 *   rows.
 * - After a successful soft-delete, repeating DELETE on the same key must fail
 *   with a not-available outcome (verified via generic error expectation).
 *
 * Steps:
 *
 * 1. Admin self-registers (join) to acquire privileges and token context.
 * 2. Create a configuration using a unique business key.
 * 3. First DELETE succeeds for the configuration key.
 * 4. Second DELETE must throw an error (already removed/not available).
 * 5. Validate key integrity and error behavior without inspecting status codes.
 */
export async function test_api_configuration_erase_already_deleted(
  connection: api.IConnection,
) {
  // 1) Authenticate as admin (self-join)
  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: typia.random<
        string & tags.MinLength<3> & tags.MaxLength<320> & tags.Format<"email">
      >(),
      password: typia.random<
        string & tags.MinLength<8> & tags.MaxLength<2000>
      >(),
      display_name: typia.random<
        string & tags.MinLength<1> & tags.MaxLength<120>
      >(),
      href: typia.random<
        string & tags.MinLength<1> & tags.MaxLength<80000> & tags.Format<"uri">
      >(),
      referrer: typia.random<
        string & tags.MinLength<1> & tags.MaxLength<80000> & tags.Format<"uri">
      >(),
      // ip is optional; omit to let server derive it
    } satisfies ICivicBoardAdminJoin.ICreate,
  });
  typia.assert(admin);

  // 2) Create a configuration with a unique key (boolean variant)
  const key: string = `e2e.${RandomGenerator.alphaNumeric(12)}`;
  const created = await api.functional.civicBoard.admin.configurations.create(
    connection,
    {
      body: {
        key,
        value_boolean: true,
      } satisfies ICivicBoardConfiguration.ICreate,
    },
  );
  typia.assert(created);
  TestValidator.equals(
    "created configuration key matches intended key",
    created.key,
    key,
  );

  // 3) First DELETE should succeed (void response)
  await api.functional.civicBoard.admin.configurations.erase(connection, {
    configurationKey: key,
  });

  // 4) Second DELETE must fail: not-available for already-removed key
  await TestValidator.error(
    "second deletion on the same configuration must fail",
    async () => {
      await api.functional.civicBoard.admin.configurations.erase(connection, {
        configurationKey: key,
      });
    },
  );
}
