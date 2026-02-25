import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformConfiguration";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_configuration_batch_update_large_scale(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      permissions_level: null,
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  typia.assert(adminAuth);
  // Generate 50+ configuration update items with realistic data
  const updateItems = ArrayUtil.repeat(
    55,
    (index) =>
      ({
        config_key: `performance.test.${index}.${RandomGenerator.alphaNumeric(8)}`,
        config_value: RandomGenerator.paragraph({ sentences: 1 }),
      }) satisfies ICommunityPlatformConfiguration.IBatchUpdateItem,
  );
  // Submit batch update and measure performance
  const startTime = Date.now();
  const batchResponse =
    await api.functional.communityPlatform.admin.configurations.batch.batchUpdate(
      adminConnection,
      {
        body: {
          updates: updateItems,
        } satisfies ICommunityPlatformConfiguration.IBatchUpdate,
      },
    );
  const endTime = Date.now();
  const responseTime = endTime - startTime;
  // Validate response structure
  typia.assert(batchResponse);
  // Performance validation - ensure response time scales reasonably
  TestValidator.predicate(
    "batch update of 55 items should complete within acceptable time",
    responseTime < 10000,
  );
  // Validate that the response contains valid configuration data
  TestValidator.predicate(
    "response should have valid config_key",
    batchResponse.config_key.length > 0,
  );
  TestValidator.predicate(
    "response should have valid config_value",
    batchResponse.config_value.length > 0,
  );
  TestValidator.predicate(
    "response should have valid data_type",
    batchResponse.data_type.length > 0,
  );
  // Validate updated_at timestamp is recent
  const updatedAt = new Date(batchResponse.updated_at);
  const now = new Date();
  const timeDiff = now.getTime() - updatedAt.getTime();
  TestValidator.predicate(
    "updated_at should be recent (within 1 minute)",
    timeDiff < 60000,
  );
  // Test atomicity by including an invalid config_key in a separate batch
  const mixedUpdateItems = [
    ...updateItems.slice(0, 5),
    {
      config_key: "", // Invalid empty config_key
      config_value: "test value",
    } satisfies ICommunityPlatformConfiguration.IBatchUpdateItem,
  ];
  await TestValidator.error(
    "batch update should fail with invalid config_key maintaining atomicity",
    async () => {
      await api.functional.communityPlatform.admin.configurations.batch.batchUpdate(
        adminConnection,
        {
          body: {
            updates: mixedUpdateItems,
          } satisfies ICommunityPlatformConfiguration.IBatchUpdate,
        },
      );
    },
  );
}
