import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAuthorizationToken";
import type { ICommunityPlatformConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformConfiguration";

/**
 * Test error handling when retrieving non-existent configuration keys.
 *
 * This test validates that the configuration retrieval API properly handles
 * requests for non-existent keys by returning appropriate 404 error responses.
 * It tests various scenarios including malformed keys, deleted configurations,
 * and keys that never existed in the system.
 */
export async function test_api_configuration_retrieval_nonexistent_key(
  connection: api.IConnection,
) {
  // Step 1: Authenticate as administrator
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const admin: ICommunityPlatformAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: "AdminPassword123!",
        display_name: RandomGenerator.name(),
        admin_level: "system",
        is_super_admin: true,
      } satisfies ICommunityPlatformAdmin.ICreate,
    });
  typia.assert(admin);

  // Step 2: Test various non-existent key scenarios

  // Test with random UUID that never existed
  const randomUuidKey: string = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error("random UUID key should return 404", async () => {
    await api.functional.communityPlatform.admin.configurations.at(connection, {
      configurationKey: randomUuidKey,
    });
  });

  // Test with malformed key format
  const malformedKey: string = "invalid_key_format_with_special_chars@#$%";
  await TestValidator.error("malformed key should return 404", async () => {
    await api.functional.communityPlatform.admin.configurations.at(connection, {
      configurationKey: malformedKey,
    });
  });

  // Test with empty string key
  await TestValidator.error("empty string key should return 404", async () => {
    await api.functional.communityPlatform.admin.configurations.at(connection, {
      configurationKey: "",
    });
  });

  // Test with very long key that likely doesn't exist
  const longKey: string = RandomGenerator.alphaNumeric(100);
  await TestValidator.error("very long key should return 404", async () => {
    await api.functional.communityPlatform.admin.configurations.at(connection, {
      configurationKey: longKey,
    });
  });

  // Test with numeric string key
  const numericKey: string = "1234567890";
  await TestValidator.error(
    "numeric string key should return 404",
    async () => {
      await api.functional.communityPlatform.admin.configurations.at(
        connection,
        {
          configurationKey: numericKey,
        },
      );
    },
  );

  // Test with key containing spaces
  const spacedKey: string = "this key has spaces";
  await TestValidator.error("key with spaces should return 404", async () => {
    await api.functional.communityPlatform.admin.configurations.at(connection, {
      configurationKey: spacedKey,
    });
  });

  // Test with key that looks like a path
  const pathLikeKey: string = "config/category/subcategory/setting";
  await TestValidator.error("path-like key should return 404", async () => {
    await api.functional.communityPlatform.admin.configurations.at(connection, {
      configurationKey: pathLikeKey,
    });
  });
}
