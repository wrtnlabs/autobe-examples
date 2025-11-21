import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallChannel";
import type { IShoppingMallConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallConfiguration";

/**
 * Validates the complete shopping mall channel creation workflow for
 * administrators.
 *
 * This test ensures that authenticated administrators can successfully create
 * new shopping mall channels with proper validation of required fields, unique
 * channel code constraints, and system-generated timestamps. The test validates
 * the complete channel creation lifecycle from authentication to channel
 * validation.
 *
 * Workflow:
 *
 * 1. Authenticate as administrator to establish authorization context
 * 2. Create a new shopping mall channel with valid data
 * 3. Validate the response structure and system-generated fields
 * 4. Test duplicate channel code constraints
 */
export async function test_api_admin_channel_creation(
  connection: api.IConnection,
) {
  // Step 1: Authenticate as administrator
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "AdminPass123!";

  const adminAuth = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      first_name: RandomGenerator.name(),
      last_name: RandomGenerator.name(),
      role: "super_admin",
      permissions: JSON.stringify({
        channel_management: true,
        user_management: true,
      }),
      status: "active",
    } satisfies IShoppingMallAdministrator.ICreate,
  });
  typia.assert(adminAuth);

  // Step 2: Create a new shopping mall channel
  const channelData = {
    code: RandomGenerator.alphaNumeric(8).toLowerCase(),
    name: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.content({ paragraphs: 1 }),
    status: "active",
    configuration: JSON.stringify({
      theme: "default",
      currency: "USD",
      language: "en",
    }),
  } satisfies IShoppingMallChannel.ICreate;

  const createdChannel =
    await api.functional.shoppingMall.admin.channels.create(connection, {
      body: channelData,
    });
  typia.assert(createdChannel);

  // Step 3: Validate the created channel response
  TestValidator.equals(
    "channel ID should be valid UUID",
    createdChannel.id,
    createdChannel.id,
  );
  TestValidator.equals(
    "channel code should match input",
    createdChannel.code,
    channelData.code,
  );
  TestValidator.equals(
    "channel name should match input",
    createdChannel.name,
    channelData.name,
  );
  TestValidator.equals(
    "channel status should match input",
    createdChannel.status,
    channelData.status,
  );
  TestValidator.predicate(
    "created_at should be valid date-time",
    createdChannel.created_at !== null &&
      createdChannel.created_at !== undefined,
  );
  TestValidator.predicate(
    "updated_at should be valid date-time",
    createdChannel.updated_at !== null &&
      createdChannel.updated_at !== undefined,
  );

  // Step 4: Test duplicate channel code constraint
  await TestValidator.error(
    "should reject duplicate channel code",
    async () => {
      await api.functional.shoppingMall.admin.channels.create(connection, {
        body: {
          ...channelData,
          name: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IShoppingMallChannel.ICreate,
      });
    },
  );
}
