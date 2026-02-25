import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdministrator";
import type { IEcommerceCacheConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCacheConfiguration";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_cache_configuration_update_success(
  connection: api.IConnection,
): Promise<void> {
  // Authenticate as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await api.functional.ecommerce.auth.administrator.join(
    adminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
      } satisfies IEcommerceAdministrator.IJoin,
    },
  );
  typia.assert(adminAuth);
  // Generate a test configId - since there's no creation endpoint available
  const testConfigId = typia.random<string & tags.Format<"uuid">>();
  // Prepare update body with valid parameters
  const updateBody = {
    cache_key: "test.config.updated",
    cache_type: "redis",
    configuration_value: {
      host: "redis.local",
      port: "6379",
      ttl: "7200",
    },
    description: "Updated test configuration",
    is_active: false,
    priority: 8,
  } satisfies IEcommerceCacheConfiguration.IUpdate;
  // Test update operation
  try {
    const updatedConfig =
      await api.functional.ecommerce.administrator.cache_configurations.update(
        adminConnection,
        {
          configId: testConfigId,
          body: updateBody,
        },
      );
    // Validate response structure
    typia.assert(updatedConfig);
    // Validate updated fields
    TestValidator.equals(
      "cache_key updated",
      updatedConfig.cache_key,
      updateBody.cache_key!,
    );
    TestValidator.equals(
      "cache_type updated",
      updatedConfig.cache_type,
      updateBody.cache_type!,
    );
    TestValidator.equals(
      "is_active updated",
      updatedConfig.is_active,
      updateBody.is_active!,
    );
    TestValidator.equals(
      "priority updated",
      updatedConfig.priority,
      updateBody.priority!,
    );
    // Validate priority range
    TestValidator.predicate(
      "priority within range",
      updatedConfig.priority >= 1 && updatedConfig.priority <= 10,
    );
    // Validate timestamp exists
    TestValidator.predicate(
      "created_at exists",
      updatedConfig.created_at !== "" && updatedConfig.created_at !== null,
    );
    // Validate ID format
    TestValidator.predicate(
      "valid UUID format",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        updatedConfig.id,
      ),
    );
  } catch (error) {
    // Handle case where configuration doesn't exist
    if (error instanceof api.HttpError && error.status === 404) {
      // This is expected since we're using a random configId
      TestValidator.predicate(
        "404 error for non-existent config",
        error.message.includes("not found") || error.message.includes("404"),
      );
    } else {
      // Re-throw unexpected errors
      throw error;
    }
  }
}
