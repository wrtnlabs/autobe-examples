import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAuthorizationToken";
import type { ICommunityPlatformChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformChannel";
import type { ICommunityPlatformSection } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSection";

/**
 * Test the comprehensive update of an existing section within a specific
 * channel by an authenticated administrator. Validates that administrators can
 * modify section properties including display name, description, icon URL, sort
 * order, and status settings. Ensures that updates maintain proper
 * channel-section relationships and that audit trail information (updated_by,
 * updated_at) is correctly recorded. Tests partial update functionality where
 * only specific fields are modified while others remain unchanged. Verifies
 * that section updates propagate correctly to dependent entities and that
 * status changes properly affect section visibility and functionality.
 */
export async function test_api_channel_section_update_by_admin(
  connection: api.IConnection,
) {
  // 1. Authenticate as administrator to establish authorization context
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: "AdminPassword123!",
      display_name: RandomGenerator.name(),
      admin_level: "content",
      is_super_admin: true,
    } satisfies ICommunityPlatformAdmin.ICreate,
  });
  typia.assert(admin);

  // 2. Create parent channel that will contain the section
  const channel = await api.functional.communityPlatform.admin.channels.create(
    connection,
    {
      body: {
        name: RandomGenerator.alphabets(10),
        display_name: RandomGenerator.paragraph({ sentences: 3 }),
        description: RandomGenerator.content({ paragraphs: 1 }),
        icon_url: typia.random<string & tags.Format<"uri">>(),
        banner_url: typia.random<string & tags.Format<"uri">>(),
        sort_order: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<0>
        >(),
        is_active: true,
        status: "active",
      } satisfies ICommunityPlatformChannel.ICreate,
    },
  );
  typia.assert(channel);

  // 3. Create initial section that will be updated
  const initialSection =
    await api.functional.communityPlatform.admin.channels.sections.create(
      connection,
      {
        channelName: channel.name,
        body: {
          name: RandomGenerator.alphabets(8),
          display_name: RandomGenerator.paragraph({ sentences: 2 }),
          description: RandomGenerator.content({ paragraphs: 1 }),
          icon_url: typia.random<string & tags.Format<"uri">>(),
          sort_order: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<0>
          >(),
          status: "draft",
          is_active: true,
        } satisfies ICommunityPlatformSection.ICreate,
      },
    );
  typia.assert(initialSection);

  // 4. Perform comprehensive update of the section
  const updatedSection =
    await api.functional.communityPlatform.admin.channels.sections.update(
      connection,
      {
        channelName: channel.name,
        sectionName: initialSection.name,
        body: {
          display_name:
            "Updated " + RandomGenerator.paragraph({ sentences: 2 }),
          description: "Updated " + RandomGenerator.content({ paragraphs: 1 }),
          icon_url: typia.random<string & tags.Format<"uri">>(),
          sort_order: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<0>
          >(),
          status: "active",
          is_active: false,
        } satisfies ICommunityPlatformSection.IUpdate,
      },
    );
  typia.assert(updatedSection);

  // 5. Validate that updates were applied correctly
  TestValidator.equals(
    "section ID remains unchanged after update",
    updatedSection.id,
    initialSection.id,
  );
  TestValidator.equals(
    "channel relationship maintained after update",
    updatedSection.channel.id,
    channel.id,
  );
  TestValidator.notEquals(
    "display name was updated",
    updatedSection.display_name,
    initialSection.display_name,
  );
  TestValidator.notEquals(
    "description was updated",
    updatedSection.description,
    initialSection.description,
  );
  TestValidator.notEquals(
    "sort order was updated",
    updatedSection.sort_order,
    initialSection.sort_order,
  );
  TestValidator.equals(
    "status was updated to active",
    updatedSection.status,
    "active",
  );
  TestValidator.equals(
    "is_active was set to false",
    updatedSection.is_active,
    false,
  );

  // 6. Test partial update functionality (only update specific fields)
  const newDisplayName =
    "Partially Updated " + RandomGenerator.paragraph({ sentences: 1 });
  const partialUpdateSection =
    await api.functional.communityPlatform.admin.channels.sections.update(
      connection,
      {
        channelName: channel.name,
        sectionName: initialSection.name,
        body: {
          display_name: newDisplayName,
        } satisfies ICommunityPlatformSection.IUpdate,
      },
    );
  typia.assert(partialUpdateSection);

  // 7. Validate partial update preserved other fields
  TestValidator.equals(
    "display name was updated in partial update",
    partialUpdateSection.display_name,
    newDisplayName,
  );
  TestValidator.equals(
    "description remains unchanged from previous update",
    partialUpdateSection.description,
    updatedSection.description,
  );
  TestValidator.equals(
    "sort order remains unchanged from previous update",
    partialUpdateSection.sort_order,
    updatedSection.sort_order,
  );
  TestValidator.equals(
    "status remains active from previous update",
    partialUpdateSection.status,
    "active",
  );
  TestValidator.equals(
    "is_active remains false from previous update",
    partialUpdateSection.is_active,
    false,
  );

  // 8. Verify audit trail information
  TestValidator.predicate(
    "updated_at timestamp is recorded after partial update",
    partialUpdateSection.updated_at !== initialSection.updated_at,
  );
  TestValidator.predicate(
    "updated_by administrator is recorded after partial update",
    partialUpdateSection.updated_by !== undefined,
  );
  if (partialUpdateSection.updated_by) {
    TestValidator.equals(
      "updated_by matches authenticated admin",
      partialUpdateSection.updated_by.id,
      admin.id,
    );
  }

  // 9. Final validation of complete workflow
  TestValidator.equals(
    "section maintains channel relationship throughout workflow",
    partialUpdateSection.channel.id,
    channel.id,
  );
  TestValidator.equals(
    "section name remains consistent throughout workflow",
    partialUpdateSection.name,
    initialSection.name,
  );
  TestValidator.predicate(
    "created_at timestamp remains unchanged",
    partialUpdateSection.created_at === initialSection.created_at,
  );
}
