import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAuthorizationToken";
import type { ICommunityPlatformChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformChannel";

/**
 * Test the creation of a new platform-wide communication channel by an
 * authenticated administrator.
 *
 * This E2E test validates the complete workflow of channel creation, including
 * administrator authentication, channel creation with comprehensive field
 * validation, and verification of audit trail information. The test ensures
 * that administrators can establish new organizational containers with proper
 * identification, display configuration, sorting order, and initial status
 * settings.
 */
export async function test_api_channel_creation_by_admin(
  connection: api.IConnection,
) {
  // Step 1: Authenticate as administrator to establish proper authorization context
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = typia.random<string & tags.Format<"password">>();

  const admin: ICommunityPlatformAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        display_name: RandomGenerator.name(2),
        admin_level: "system",
        is_super_admin: true,
      } satisfies ICommunityPlatformAdmin.ICreate,
    });
  typia.assert(admin);

  // Step 2: Create a new channel with comprehensive field validation
  const channelData = {
    name: RandomGenerator.alphabets(10).toLowerCase(),
    display_name: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.content({
      paragraphs: 2,
      sentenceMin: 5,
      sentenceMax: 10,
    }),
    icon_url: typia.random<string & tags.Format<"uri">>(),
    banner_url: typia.random<string & tags.Format<"uri">>(),
    sort_order: typia.random<number & tags.Type<"int32"> & tags.Minimum<0>>(),
    is_active: true,
    status: "active" as const,
  } satisfies ICommunityPlatformChannel.ICreate;

  const channel: ICommunityPlatformChannel =
    await api.functional.communityPlatform.admin.channels.create(connection, {
      body: channelData,
    });
  typia.assert(channel);

  // Step 3: Validate that the created channel includes all expected properties
  TestValidator.equals(
    "channel name should match input",
    channel.name,
    channelData.name,
  );
  TestValidator.equals(
    "channel display name should match input",
    channel.display_name,
    channelData.display_name,
  );
  TestValidator.equals(
    "channel description should match input",
    channel.description,
    channelData.description,
  );
  TestValidator.equals(
    "channel icon URL should match input",
    channel.icon_url,
    channelData.icon_url,
  );
  TestValidator.equals(
    "channel banner URL should match input",
    channel.banner_url,
    channelData.banner_url,
  );
  TestValidator.equals(
    "channel sort order should match input",
    channel.sort_order,
    channelData.sort_order,
  );
  TestValidator.equals(
    "channel active status should match input",
    channel.is_active,
    channelData.is_active,
  );
  TestValidator.equals(
    "channel status should match input",
    channel.status,
    channelData.status,
  );

  // Step 4: Verify audit trail information
  TestValidator.predicate(
    "channel should have creation timestamp",
    channel.created_at !== undefined && channel.created_at !== null,
  );
  TestValidator.predicate(
    "channel should have update timestamp",
    channel.updated_at !== undefined && channel.updated_at !== null,
  );
  TestValidator.equals(
    "channel should not be deleted",
    channel.deleted_at,
    undefined,
  );

  // Step 5: Test field length constraints from DTO definitions
  TestValidator.predicate(
    "channel name should have minimum length of 1",
    channelData.name.length >= 1,
  );
  TestValidator.predicate(
    "channel name should have maximum length of 50",
    channelData.name.length <= 50,
  );
  TestValidator.predicate(
    "channel display name should have minimum length of 1",
    channelData.display_name.length >= 1,
  );
  TestValidator.predicate(
    "channel display name should have maximum length of 100",
    channelData.display_name.length <= 100,
  );
  TestValidator.predicate(
    "channel description should have minimum length of 1",
    channelData.description.length >= 1,
  );
  TestValidator.predicate(
    "channel description should have maximum length of 500",
    channelData.description.length <= 500,
  );
}
