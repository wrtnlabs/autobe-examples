import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformConfiguration";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformConfiguration";

export async function test_api_platform_configuration_retrieve_all_available_keys(
  connection: api.IConnection,
) {
  // Step 1: Create administrator account
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminUsername = RandomGenerator.alphabets(10);
  const adminName = RandomGenerator.name(2);

  const admin: ICommunityPlatformAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: adminEmail,
        password: "SecurePassword123",
        username: adminUsername,
        name: adminName,
        href: "http://localhost:3000/admin",
        referrer: null,
        ip: "127.0.0.1",
      } satisfies ICommunityPlatformAdministrator.ICreate,
    });
  typia.assert(admin);

  // Step 2: Search for all available configurations using patch endpoint
  const configurationList: IPageICommunityPlatformConfiguration.ISummary =
    await api.functional.communityPlatform.administrator.configurations.index(
      connection,
      {
        body: {
          page: 1,
          limit: 100,
          sort_by: "key",
          order: "asc",
        } satisfies ICommunityPlatformConfiguration.IRequest,
      },
    );
  typia.assert(configurationList);

  // Step 3: Validate that search returned configurations
  TestValidator.predicate(
    "configuration list should contain data",
    configurationList.data.length > 0,
  );

  // Step 4: Retrieve each configuration individually by its key
  const retrievedConfigurations: ICommunityPlatformConfiguration[] = [];

  for (const configSummary of configurationList.data) {
    const configuration: ICommunityPlatformConfiguration =
      await api.functional.communityPlatform.administrator.configurations.at(
        connection,
        {
          configurationKey: configSummary.key,
        },
      );
    typia.assert(configuration);
    retrievedConfigurations.push(configuration);

    // Validate that retrieved configuration matches summary data
    TestValidator.equals(
      `configuration key should match for ${configSummary.key}`,
      configuration.key,
      configSummary.key,
    );
    TestValidator.equals(
      `configuration value should match for ${configSummary.key}`,
      configuration.value,
      configSummary.value,
    );
  }

  // Step 5: Validate all configurations were successfully retrieved
  TestValidator.equals(
    "all configurations from search should be retrievable",
    retrievedConfigurations.length,
    configurationList.data.length,
  );

  // Step 6: Verify that all keys from search results are valid for individual retrieval
  TestValidator.predicate(
    "every configuration from search should be retrievable individually",
    retrievedConfigurations.length === configurationList.data.length &&
      retrievedConfigurations.every(
        (config, index) => config.key === configurationList.data[index].key,
      ),
  );
}
