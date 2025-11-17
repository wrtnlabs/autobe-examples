import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityAdmin";
import type { IRedditCommunitySystemConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunitySystemConfiguration";

export async function test_api_reddit_community_system_configurations_create_by_admin(
  connection: api.IConnection,
) {
  // 1. Register a new admin user by the join operation to gain authentication token
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const adminPassword = "StrongP@ssw0rd";
  const adminAuthorized: IRedditCommunityAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        href: "https://example.com/admin/signup",
        referrer: "https://example.com/home",
      } satisfies IRedditCommunityAdmin.IJoin,
    });
  typia.assert(adminAuthorized);

  // 2. Create a new system configuration setting with unique name, value, and optional description
  const configName = `test_config_${RandomGenerator.alphaNumeric(8)}`;
  const configValue = RandomGenerator.paragraph({
    sentences: 3,
    wordMin: 4,
    wordMax: 8,
  });
  const configDescription = RandomGenerator.paragraph({
    sentences: 6,
    wordMin: 5,
    wordMax: 10,
  });

  const systemConfig: IRedditCommunitySystemConfiguration =
    await api.functional.redditCommunity.admin.redditCommunitySystemConfigurations.create(
      connection,
      {
        body: {
          name: configName,
          value: configValue,
          description: configDescription,
        } satisfies IRedditCommunitySystemConfiguration.ICreate,
      },
    );
  typia.assert(systemConfig);

  // 3. Validate the returned system configuration
  TestValidator.equals(
    "created configuration name matches",
    systemConfig.name,
    configName,
  );
  TestValidator.equals(
    "created configuration value matches",
    systemConfig.value,
    configValue,
  );
  TestValidator.equals(
    "created configuration description matches",
    systemConfig.description,
    configDescription,
  );
  TestValidator.predicate(
    "configuration id is non-empty string",
    typeof systemConfig.id === "string" && systemConfig.id.length > 0,
  );
  TestValidator.predicate(
    "configuration created_at has ISO8601 date-time",
    /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}Z$/.test(
      systemConfig.created_at,
    ),
  );
  TestValidator.predicate(
    "configuration updated_at has ISO8601 date-time",
    /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}Z$/.test(
      systemConfig.updated_at,
    ),
  );

  // 4. Ensure deleted_at is null or undefined
  TestValidator.predicate(
    "configuration deleted_at is null or undefined",
    systemConfig.deleted_at === null || systemConfig.deleted_at === undefined,
  );
}
