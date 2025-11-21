import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAuthorizationToken";
import type { ICommunityPlatformChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformChannel";

/**
 * Test the creation of platform-wide communication channels by administrators.
 *
 * This E2E test validates that administrators can create new communication
 * channels with proper metadata including name, display name, description, and
 * configuration settings. The test ensures channel names are unique across the
 * platform and that all required fields meet specified constraints.
 */
export async function test_api_admin_channel_creation(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate as administrator
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = typia.random<string & tags.Format<"password">>();

  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      display_name: RandomGenerator.paragraph({ sentences: 2 }),
      admin_level: "system",
      is_super_admin: true,
    } satisfies ICommunityPlatformAdmin.ICreate,
  });
  typia.assert(admin);

  // Step 2: Create first channel with basic required fields
  const channel1Data = {
    name: RandomGenerator.alphabets(10),
    display_name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.content({ paragraphs: 1 }),
    sort_order: typia.random<number & tags.Type<"int32"> & tags.Minimum<0>>(),
    is_active: true,
    status: "active" as const,
  } satisfies ICommunityPlatformChannel.ICreate;

  const channel1 = await api.functional.communityPlatform.admin.channels.create(
    connection,
    { body: channel1Data },
  );
  typia.assert(channel1);

  // Validate channel1 creation
  TestValidator.equals(
    "channel1 name matches input",
    channel1.name,
    channel1Data.name,
  );
  TestValidator.equals(
    "channel1 display_name matches input",
    channel1.display_name,
    channel1Data.display_name,
  );
  TestValidator.equals(
    "channel1 description matches input",
    channel1.description,
    channel1Data.description,
  );
  TestValidator.equals(
    "channel1 sort_order matches input",
    channel1.sort_order,
    channel1Data.sort_order,
  );
  TestValidator.equals(
    "channel1 is_active matches input",
    channel1.is_active,
    channel1Data.is_active,
  );
  TestValidator.equals(
    "channel1 status matches input",
    channel1.status,
    channel1Data.status,
  );
  TestValidator.predicate(
    "channel1 has valid UUID id",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      channel1.id,
    ),
  );

  // Step 3: Create second channel with optional fields
  const channel2Data = {
    name: RandomGenerator.alphabets(12),
    display_name: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    icon_url: typia.random<string & tags.Format<"uri">>(),
    banner_url: typia.random<string & tags.Format<"uri">>(),
    sort_order: typia.random<number & tags.Type<"int32"> & tags.Minimum<0>>(),
    is_active: false,
    status: "draft" as const,
  } satisfies ICommunityPlatformChannel.ICreate;

  const channel2 = await api.functional.communityPlatform.admin.channels.create(
    connection,
    { body: channel2Data },
  );
  typia.assert(channel2);

  // Validate channel2 creation
  TestValidator.equals(
    "channel2 name matches input",
    channel2.name,
    channel2Data.name,
  );
  TestValidator.equals(
    "channel2 display_name matches input",
    channel2.display_name,
    channel2Data.display_name,
  );
  TestValidator.equals(
    "channel2 description matches input",
    channel2.description,
    channel2Data.description,
  );
  TestValidator.equals(
    "channel2 icon_url matches input",
    channel2.icon_url,
    channel2Data.icon_url,
  );
  TestValidator.equals(
    "channel2 banner_url matches input",
    channel2.banner_url,
    channel2Data.banner_url,
  );
  TestValidator.equals(
    "channel2 sort_order matches input",
    channel2.sort_order,
    channel2Data.sort_order,
  );
  TestValidator.equals(
    "channel2 is_active matches input",
    channel2.is_active,
    channel2Data.is_active,
  );
  TestValidator.equals(
    "channel2 status matches input",
    channel2.status,
    channel2Data.status,
  );

  // Step 4: Test duplicate channel name validation
  await TestValidator.error("duplicate channel name should fail", async () => {
    await api.functional.communityPlatform.admin.channels.create(connection, {
      body: { ...channel1Data, name: channel1Data.name },
    });
  });

  // Step 5: Create third channel with different configuration
  const channel3Data = {
    name: RandomGenerator.alphabets(8),
    display_name: RandomGenerator.paragraph({ sentences: 1 }),
    description: RandomGenerator.content({ paragraphs: 1 }),
    sort_order: 0,
    is_active: true,
    status: "active" as const,
  } satisfies ICommunityPlatformChannel.ICreate;

  const channel3 = await api.functional.communityPlatform.admin.channels.create(
    connection,
    { body: channel3Data },
  );
  typia.assert(channel3);

  // Validate channel3 creation
  TestValidator.equals(
    "channel3 name matches input",
    channel3.name,
    channel3Data.name,
  );
  TestValidator.equals(
    "channel3 display_name matches input",
    channel3.display_name,
    channel3Data.display_name,
  );
  TestValidator.equals(
    "channel3 description matches input",
    channel3.description,
    channel3Data.description,
  );
  TestValidator.equals(
    "channel3 sort_order matches input",
    channel3.sort_order,
    channel3Data.sort_order,
  );
  TestValidator.equals(
    "channel3 is_active matches input",
    channel3.is_active,
    channel3Data.is_active,
  );
  TestValidator.equals(
    "channel3 status matches input",
    channel3.status,
    channel3Data.status,
  );

  // Step 6: Validate all channels have unique IDs using proper uniqueness check
  const channelIds = [channel1.id, channel2.id, channel3.id];
  const uniqueIds = new Set(channelIds);
  TestValidator.equals(
    "all channel IDs should be unique",
    uniqueIds.size,
    channelIds.length,
  );
}
