import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoAppConfigurationSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppConfigurationSnapshot";
import type { ITodoAppConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppConfiguration";
import type { ITodoAppConfigurationSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppConfigurationSnapshot";
import type { ITodoAppConfigurationValue } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppConfigurationValue";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";

/**
 * Test comprehensive configuration snapshot listing functionality for
 * authenticated users. Validates that users can search and filter historical
 * configuration snapshots with pagination support, including filtering by
 * configuration version, snapshot reason, category, date ranges, and testing
 * sorting options and pagination functionality.
 */
export async function test_api_configuration_snapshot_listing_by_user(
  connection: api.IConnection,
) {
  // Step 1: Create authenticated user context
  const userData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "TestPassword123!",
    name: RandomGenerator.name(),
    href: "https://example.com/register",
    referrer: "https://example.com",
  } satisfies ITodoAppUser.ICreate;

  const authorizedUser = await api.functional.auth.user.join(connection, {
    body: userData,
  });
  typia.assert(authorizedUser);

  // Step 2: Create configuration definition
  const configurationData = {
    config_key: "security.authentication.session_timeout",
    name: "Session Timeout",
    description:
      "Controls how long user sessions remain active before requiring re-authentication",
    data_type: "number",
    default_value: "3600",
    category: "security",
    is_sensitive: false,
    is_required: true,
  } satisfies ITodoAppConfiguration.ICreate;

  const configuration = await api.functional.todoApp.user.configurations.create(
    connection,
    {
      body: configurationData,
    },
  );
  typia.assert(configuration);

  // Step 3: Create configuration values to trigger snapshots
  const configValueData1 = {
    environment: "development",
    config_value: "1800",
    value_type: "number",
    is_active: true,
  } satisfies ITodoAppConfigurationValue.ICreate;

  const configValue1 =
    await api.functional.todoApp.user.configurations.values.postByConfigkey(
      connection,
      {
        configKey: configuration.config_key,
        body: configValueData1,
      },
    );
  typia.assert(configValue1);

  const configValueData2 = {
    environment: "production",
    config_value: "7200",
    value_type: "number",
    is_active: true,
  } satisfies ITodoAppConfigurationValue.ICreate;

  const configValue2 =
    await api.functional.todoApp.user.configurations.values.postByConfigkey(
      connection,
      {
        configKey: configuration.config_key,
        body: configValueData2,
      },
    );
  typia.assert(configValue2);

  // Step 4: Test basic snapshot listing with pagination
  const baseRequest = {
    page: 1,
    limit: 10,
  } satisfies ITodoAppConfigurationSnapshot.IRequest;

  const baseSnapshots =
    await api.functional.todoApp.user.configurations.snapshots.index(
      connection,
      {
        configurationId: configuration.id,
        body: baseRequest,
      },
    );
  typia.assert(baseSnapshots);

  TestValidator.predicate(
    "snapshots pagination should return valid structure",
    baseSnapshots.pagination.current === 1 &&
      baseSnapshots.pagination.limit === 10 &&
      baseSnapshots.pagination.records >= 0 &&
      baseSnapshots.pagination.pages >= 0,
  );

  TestValidator.predicate(
    "snapshots data should be an array",
    Array.isArray(baseSnapshots.data),
  );

  // Step 5: Test filtering by version
  if (baseSnapshots.data.length > 0) {
    const firstSnapshot = baseSnapshots.data[0];
    const versionFilterRequest = {
      page: 1,
      limit: 10,
      version: firstSnapshot.version,
    } satisfies ITodoAppConfigurationSnapshot.IRequest;

    const versionFilteredSnapshots =
      await api.functional.todoApp.user.configurations.snapshots.index(
        connection,
        {
          configurationId: configuration.id,
          body: versionFilterRequest,
        },
      );
    typia.assert(versionFilteredSnapshots);

    TestValidator.predicate(
      "version filtered snapshots should contain matching version",
      versionFilteredSnapshots.data.every(
        (snapshot) => snapshot.version === firstSnapshot.version,
      ),
    );
  }

  // Step 6: Test filtering by category
  const categoryFilterRequest = {
    page: 1,
    limit: 10,
    category: configuration.category,
  } satisfies ITodoAppConfigurationSnapshot.IRequest;

  const categoryFilteredSnapshots =
    await api.functional.todoApp.user.configurations.snapshots.index(
      connection,
      {
        configurationId: configuration.id,
        body: categoryFilterRequest,
      },
    );
  typia.assert(categoryFilteredSnapshots);

  TestValidator.predicate(
    "category filtered snapshots should contain matching category",
    categoryFilteredSnapshots.data.every(
      (snapshot) => snapshot.category === configuration.category,
    ),
  );

  // Step 7: Test date range filtering
  const currentDate = new Date().toISOString();
  const pastDate = new Date(Date.now() - 86400000).toISOString(); // 1 day ago

  const dateRangeRequest = {
    page: 1,
    limit: 10,
    created_from: pastDate,
    created_to: currentDate,
  } satisfies ITodoAppConfigurationSnapshot.IRequest;

  const dateRangeSnapshots =
    await api.functional.todoApp.user.configurations.snapshots.index(
      connection,
      {
        configurationId: configuration.id,
        body: dateRangeRequest,
      },
    );
  typia.assert(dateRangeSnapshots);

  // Step 8: Test sorting by creation date
  const sortByCreatedAtRequest = {
    page: 1,
    limit: 10,
    order_by: "created_at",
    order_direction: "desc",
  } satisfies ITodoAppConfigurationSnapshot.IRequest;

  const sortedSnapshots =
    await api.functional.todoApp.user.configurations.snapshots.index(
      connection,
      {
        configurationId: configuration.id,
        body: sortByCreatedAtRequest,
      },
    );
  typia.assert(sortedSnapshots);

  if (sortedSnapshots.data.length > 1) {
    TestValidator.predicate(
      "snapshots should be sorted by creation date descending",
      new Date(sortedSnapshots.data[0].created_at) >
        new Date(sortedSnapshots.data[1].created_at),
    );
  }

  // Step 9: Test different page sizes
  const smallPageRequest = {
    page: 1,
    limit: 5,
  } satisfies ITodoAppConfigurationSnapshot.IRequest;

  const smallPageSnapshots =
    await api.functional.todoApp.user.configurations.snapshots.index(
      connection,
      {
        configurationId: configuration.id,
        body: smallPageRequest,
      },
    );
  typia.assert(smallPageSnapshots);

  TestValidator.equals(
    "small page limit should be respected",
    smallPageSnapshots.pagination.limit,
    5,
  );

  // Step 10: Test search functionality
  const searchRequest = {
    page: 1,
    limit: 10,
    search: configuration.config_key.substring(0, 5),
  } satisfies ITodoAppConfigurationSnapshot.IRequest;

  const searchSnapshots =
    await api.functional.todoApp.user.configurations.snapshots.index(
      connection,
      {
        configurationId: configuration.id,
        body: searchRequest,
      },
    );
  typia.assert(searchSnapshots);

  // Step 11: Test configuration-specific filtering
  const configSpecificRequest = {
    page: 1,
    limit: 10,
    configuration_id: configuration.id,
  } satisfies ITodoAppConfigurationSnapshot.IRequest;

  const configSpecificSnapshots =
    await api.functional.todoApp.user.configurations.snapshots.index(
      connection,
      {
        configurationId: configuration.id,
        body: configSpecificRequest,
      },
    );
  typia.assert(configSpecificSnapshots);

  TestValidator.predicate(
    "configuration-specific snapshots should belong to the target configuration",
    configSpecificSnapshots.data.every(
      (snapshot) => snapshot.config_key === configuration.config_key,
    ),
  );

  // Step 12: Test error scenario - invalid configuration ID
  await TestValidator.error(
    "should fail with invalid configuration ID",
    async () => {
      await api.functional.todoApp.user.configurations.snapshots.index(
        connection,
        {
          configurationId: "invalid-uuid-format",
          body: baseRequest,
        },
      );
    },
  );

  // Step 13: Test error scenario - invalid pagination parameters
  await TestValidator.error(
    "should fail with invalid page number",
    async () => {
      const invalidRequest = {
        page: 0, // Invalid: page must be >= 1
        limit: 10,
      } satisfies ITodoAppConfigurationSnapshot.IRequest;

      await api.functional.todoApp.user.configurations.snapshots.index(
        connection,
        {
          configurationId: configuration.id,
          body: invalidRequest,
        },
      );
    },
  );
}
