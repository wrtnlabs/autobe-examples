import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformConfiguration";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";

export async function test_api_platform_configuration_uuid_format(
  connection: api.IConnection,
) {
  // Step 1: Create administrator account for authentication
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "SecurePassword123!";
  const adminUsername = RandomGenerator.alphabets(8);
  const adminName = RandomGenerator.name();

  const administrator: ICommunityPlatformAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        username: adminUsername,
        name: adminName,
        href: "http://localhost:3000/admin/register",
        referrer: null,
        ip: "127.0.0.1",
      } satisfies ICommunityPlatformAdministrator.ICreate,
    });
  typia.assert(administrator);

  // Step 2: Retrieve first configuration and validate UUID format
  const configKey1 = "max_posts_per_hour";
  const config1: ICommunityPlatformConfiguration =
    await api.functional.communityPlatform.administrator.configurations.at(
      connection,
      {
        configurationKey: configKey1,
      },
    );
  typia.assert(config1);

  // Validate first configuration ID is valid UUID
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  TestValidator.predicate(
    "configuration 1 id is valid UUID format",
    uuidRegex.test(config1.id),
  );
  TestValidator.equals(
    "config1 id length is 36 characters",
    config1.id.length,
    36,
  );

  // Step 3: Retrieve second configuration and validate UUID format
  const configKey2 = "voting_enabled";
  const config2: ICommunityPlatformConfiguration =
    await api.functional.communityPlatform.administrator.configurations.at(
      connection,
      {
        configurationKey: configKey2,
      },
    );
  typia.assert(config2);

  // Validate second configuration ID is valid UUID
  TestValidator.predicate(
    "configuration 2 id is valid UUID format",
    uuidRegex.test(config2.id),
  );
  TestValidator.equals(
    "config2 id length is 36 characters",
    config2.id.length,
    36,
  );

  // Step 4: Verify UUID uniqueness across configurations
  TestValidator.notEquals(
    "configuration IDs should be unique across different configs",
    config1.id,
    config2.id,
  );

  // Step 5: Retrieve third configuration and validate UUID format
  const configKey3 = "min_karma_to_post";
  const config3: ICommunityPlatformConfiguration =
    await api.functional.communityPlatform.administrator.configurations.at(
      connection,
      {
        configurationKey: configKey3,
      },
    );
  typia.assert(config3);

  // Validate third configuration ID is valid UUID
  TestValidator.predicate(
    "configuration 3 id is valid UUID format",
    uuidRegex.test(config3.id),
  );

  // Step 6: Verify all three configurations have unique IDs
  TestValidator.notEquals(
    "config1 and config3 IDs should be different",
    config1.id,
    config3.id,
  );
  TestValidator.notEquals(
    "config2 and config3 IDs should be different",
    config2.id,
    config3.id,
  );

  // Step 7: Validate UUID structure with detailed checks
  const parts1 = config1.id.split("-");
  TestValidator.equals(
    "UUID has 5 parts separated by hyphens",
    parts1.length,
    5,
  );
  TestValidator.equals("UUID part 1 length is 8", parts1[0].length, 8);
  TestValidator.equals("UUID part 2 length is 4", parts1[1].length, 4);
  TestValidator.equals("UUID part 3 length is 4", parts1[2].length, 4);
  TestValidator.equals("UUID part 4 length is 4", parts1[3].length, 4);
  TestValidator.equals("UUID part 5 length is 12", parts1[4].length, 12);

  // Step 8: Verify all configuration IDs can be parsed as valid UUIDs
  const uuids = [config1.id, config2.id, config3.id];
  for (const uuid of uuids) {
    TestValidator.predicate(
      `UUID ${uuid} matches standard format`,
      uuidRegex.test(uuid),
    );
  }
}
