import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityAdmin";
import type { IRedditCommunitySystemConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunitySystemConfiguration";
import type { IRedditCommunityUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUser";

/**
 * Test retrieval of a specific system configuration by ID ensuring admins can
 * access configuration details for platform management. Verify handling of
 * valid and invalid IDs, and authorization enforcement.
 */
export async function test_api_reddit_community_system_configuration_retrieval_by_admin(
  connection: api.IConnection,
) {
  // Attempt unauthorized access first
  const someId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  await TestValidator.error("unauthorized retrieval should fail", async () => {
    await api.functional.redditCommunity.admin.redditCommunitySystemConfigurations.at(
      connection,
      { id: someId },
    );
  });

  // Prepare admin credentials to login
  const adminCreate: IRedditCommunityAdmin.ICreate = {
    user_id: typia.random<string & tags.Format<"uuid">>(),
  } satisfies IRedditCommunityAdmin.ICreate;

  // Authenticate as admin by joining to obtain credentials and tokens
  const adminAuthorized: IRedditCommunityAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminCreate,
    });
  typia.assert(adminAuthorized);

  // Use the token implicitly via connection.headers modified by join

  // Retrieve a system configuration by a valid ID
  const validId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const config: IRedditCommunitySystemConfiguration =
    await api.functional.redditCommunity.admin.redditCommunitySystemConfigurations.at(
      connection,
      { id: validId },
    );
  typia.assert(config);
  TestValidator.equals("config id should match queried id", config.id, validId);
  TestValidator.predicate(
    "config key is a non-empty string",
    0 < config.config_key.length,
  );
  TestValidator.predicate(
    "config value is a non-empty string",
    0 < config.config_value.length,
  );
  if (config.description !== null && config.description !== undefined)
    TestValidator.predicate(
      "description is string if present",
      typeof config.description === "string",
    );
  TestValidator.predicate("created_at is valid date-time", !!config.created_at);
  TestValidator.predicate("updated_at is valid date-time", !!config.updated_at);

  // Test retrieval using an invalid ID (e.g., zero UUID) and expect an error
  const invalidId =
    "00000000-0000-0000-0000-000000000000" satisfies string as string &
      tags.Format<"uuid">;
  await TestValidator.error(
    "retrieval with invalid ID should fail",
    async () => {
      await api.functional.redditCommunity.admin.redditCommunitySystemConfigurations.at(
        connection,
        { id: invalidId },
      );
    },
  );
}
