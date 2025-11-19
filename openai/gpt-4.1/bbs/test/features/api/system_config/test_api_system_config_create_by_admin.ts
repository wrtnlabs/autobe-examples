import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardSystemConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSystemConfig";

/**
 * Test successful creation of a new system configuration entry by an
 * authenticated admin account.
 *
 * Steps:
 *
 * 1. Register new admin using valid unique email and a strong password (min 8
 *    chars), plus required session metadata (valid uri for href/referrer,
 *    optional null IP)
 * 2. (Implicit) Authenticate as admin (join response gives token and admin
 *    principal)
 * 3. Create a new config entry using valid, unique config_key and representative
 *    string config_value (optional human description)
 * 4. Validate that created config entry fields match what was sent, and
 *    id/created_at/updated_at are correctly formed (uuid, ISO date-times)
 * 5. Attempt to create a config without authentication and ensure creation is
 *    rejected (auth is enforced)
 */
export async function test_api_system_config_create_by_admin(
  connection: api.IConnection,
) {
  // 1. Register admin account
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(10) + "Aa$";
  const adminHref = "https://admin-join.example.com/register";
  const adminReferrer = "https://admin-portal.example.com/landing";

  const joinInput = {
    email: adminEmail,
    password: adminPassword satisfies string as string,
    href: adminHref,
    referrer: adminReferrer,
    ip: null,
  } satisfies IDiscussionBoardAdmin.IJoin;
  const admin = await api.functional.auth.admin.join(connection, {
    body: joinInput,
  });
  typia.assert(admin);

  // 2. Compose config creation input (unique per test run)
  const configKey = `feature_${RandomGenerator.alphabets(8)}`;
  const configValue = RandomGenerator.alphaNumeric(10);
  const description = RandomGenerator.paragraph({ sentences: 3 });
  const configInput = {
    config_key: configKey,
    config_value: configValue,
    description,
  } satisfies IDiscussionBoardSystemConfig.ICreate;
  // 3. Create the config entry as authenticated admin
  const config =
    await api.functional.discussionBoard.admin.systemConfigs.create(
      connection,
      { body: configInput },
    );
  typia.assert(config);
  TestValidator.equals("config_key matches", config.config_key, configKey);
  TestValidator.equals(
    "config_value matches",
    config.config_value,
    configValue,
  );
  TestValidator.equals("description matches", config.description, description);
  TestValidator.predicate(
    "id is uuid",
    typeof config.id === "string" &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        config.id,
      ),
  );
  TestValidator.predicate(
    "created_at is ISO",
    typeof config.created_at === "string" && /T.*Z$/.test(config.created_at),
  );
  TestValidator.predicate(
    "updated_at is ISO",
    typeof config.updated_at === "string" && /T.*Z$/.test(config.updated_at),
  );
  TestValidator.equals(
    "deleted_at is null or undefined",
    config.deleted_at,
    null,
  );

  // 4. Unauthenticated attempt should fail
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthenticated config create should be rejected",
    async () => {
      await api.functional.discussionBoard.admin.systemConfigs.create(
        unauthConn,
        { body: configInput },
      );
    },
  );
}
