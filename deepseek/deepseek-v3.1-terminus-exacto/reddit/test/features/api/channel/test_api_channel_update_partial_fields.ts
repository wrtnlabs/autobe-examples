import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAuthorizationToken";
import type { ICommunityPlatformChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformChannel";

/**
 * Test partial channel update scenario where an administrator modifies only
 * specific fields while leaving others unchanged. Validates that the update
 * operation supports selective field modification without requiring complete
 * channel reconfiguration. The test ensures that unspecified fields retain
 * their original values and that the system properly handles partial update
 * requests with mixed field combinations.
 */
export async function test_api_channel_update_partial_fields(
  connection: api.IConnection,
) {
  // Step 1: Authenticate as administrator for channel modification privileges
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "securePassword123";

  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      display_name: RandomGenerator.name(),
      admin_level: "content",
      is_super_admin: false,
    } satisfies ICommunityPlatformAdmin.ICreate,
  });
  typia.assert(admin);

  // Step 2: Create base channel to test partial update functionality
  const initialChannelData = {
    name: RandomGenerator.alphabets(10).toLowerCase(),
    display_name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.content({
      paragraphs: 1,
      sentenceMin: 3,
      sentenceMax: 5,
    }),
    icon_url: typia.random<string & tags.Format<"uri">>(),
    banner_url: typia.random<string & tags.Format<"uri">>(),
    sort_order: typia.random<number & tags.Type<"int32"> & tags.Minimum<0>>(),
    is_active: true,
    status: "active" as const,
  } satisfies ICommunityPlatformChannel.ICreate;

  const createdChannel =
    await api.functional.communityPlatform.admin.channels.create(connection, {
      body: initialChannelData,
    });
  typia.assert(createdChannel);

  // Step 3: Perform partial update - modify only display_name and description
  const partialUpdate1 = {
    display_name: "Updated " + RandomGenerator.paragraph({ sentences: 2 }),
    description:
      "Modified " +
      RandomGenerator.content({
        paragraphs: 1,
        sentenceMin: 2,
        sentenceMax: 4,
      }),
  } satisfies ICommunityPlatformChannel.IUpdate;

  const updatedChannel1 =
    await api.functional.communityPlatform.admin.channels.update(connection, {
      channelName: createdChannel.name,
      body: partialUpdate1,
    });
  typia.assert(updatedChannel1);

  // Validate that modified fields are updated
  TestValidator.equals(
    "display_name should be updated",
    updatedChannel1.display_name,
    partialUpdate1.display_name,
  );
  TestValidator.equals(
    "description should be updated",
    updatedChannel1.description,
    partialUpdate1.description,
  );

  // Validate that unspecified fields remain unchanged
  TestValidator.equals(
    "name should remain unchanged",
    updatedChannel1.name,
    createdChannel.name,
  );
  TestValidator.equals(
    "icon_url should remain unchanged",
    updatedChannel1.icon_url,
    createdChannel.icon_url,
  );
  TestValidator.equals(
    "banner_url should remain unchanged",
    updatedChannel1.banner_url,
    createdChannel.banner_url,
  );
  TestValidator.equals(
    "sort_order should remain unchanged",
    updatedChannel1.sort_order,
    createdChannel.sort_order,
  );
  TestValidator.equals(
    "is_active should remain unchanged",
    updatedChannel1.is_active,
    createdChannel.is_active,
  );
  TestValidator.equals(
    "status should remain unchanged",
    updatedChannel1.status,
    createdChannel.status,
  );

  // Step 4: Perform another partial update - modify only sort_order and status
  const partialUpdate2 = {
    sort_order: typia.random<number & tags.Type<"int32"> & tags.Minimum<0>>(),
    status: "draft",
  } satisfies ICommunityPlatformChannel.IUpdate;

  const updatedChannel2 =
    await api.functional.communityPlatform.admin.channels.update(connection, {
      channelName: createdChannel.name,
      body: partialUpdate2,
    });
  typia.assert(updatedChannel2);

  // Validate that modified fields are updated
  TestValidator.equals(
    "sort_order should be updated",
    updatedChannel2.sort_order,
    partialUpdate2.sort_order,
  );
  TestValidator.equals(
    "status should be updated",
    updatedChannel2.status,
    partialUpdate2.status,
  );

  // Validate that previously updated fields remain as they were
  TestValidator.equals(
    "display_name should retain previous update",
    updatedChannel2.display_name,
    partialUpdate1.display_name,
  );
  TestValidator.equals(
    "description should retain previous update",
    updatedChannel2.description,
    partialUpdate1.description,
  );

  // Validate that other unchanged fields remain as they were
  TestValidator.equals(
    "name should remain unchanged throughout",
    updatedChannel2.name,
    createdChannel.name,
  );
  TestValidator.equals(
    "icon_url should remain unchanged throughout",
    updatedChannel2.icon_url,
    createdChannel.icon_url,
  );
  TestValidator.equals(
    "banner_url should remain unchanged throughout",
    updatedChannel2.banner_url,
    createdChannel.banner_url,
  );

  // Step 5: Perform final partial update - modify icon_url and banner_url
  const partialUpdate3 = {
    icon_url: typia.random<string & tags.Format<"uri">>(),
    banner_url: typia.random<string & tags.Format<"uri">>(),
    is_active: false,
  } satisfies ICommunityPlatformChannel.IUpdate;

  const updatedChannel3 =
    await api.functional.communityPlatform.admin.channels.update(connection, {
      channelName: createdChannel.name,
      body: partialUpdate3,
    });
  typia.assert(updatedChannel3);

  // Validate final state after all partial updates
  TestValidator.equals(
    "icon_url should be updated",
    updatedChannel3.icon_url,
    partialUpdate3.icon_url,
  );
  TestValidator.equals(
    "banner_url should be updated",
    updatedChannel3.banner_url,
    partialUpdate3.banner_url,
  );
  TestValidator.equals(
    "is_active should be updated",
    updatedChannel3.is_active,
    partialUpdate3.is_active,
  );

  // Validate that all previous updates are preserved
  TestValidator.equals(
    "display_name should retain all previous updates",
    updatedChannel3.display_name,
    partialUpdate1.display_name,
  );
  TestValidator.equals(
    "description should retain all previous updates",
    updatedChannel3.description,
    partialUpdate1.description,
  );
  TestValidator.equals(
    "sort_order should retain previous update",
    updatedChannel3.sort_order,
    partialUpdate2.sort_order,
  );
  TestValidator.equals(
    "status should retain previous update",
    updatedChannel3.status,
    partialUpdate2.status,
  );

  // Final validation that the immutable field remains unchanged
  TestValidator.equals(
    "name should remain immutable throughout all updates",
    updatedChannel3.name,
    createdChannel.name,
  );
}
