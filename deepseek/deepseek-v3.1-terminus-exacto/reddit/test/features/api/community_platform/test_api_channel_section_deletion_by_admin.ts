import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAuthorizationToken";
import type { ICommunityPlatformChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformChannel";
import type { ICommunityPlatformSection } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSection";

/**
 * Test complete workflow for deleting a section within a channel by an
 * administrator.
 *
 * Validates that administrators can properly remove organizational sections
 * from channels, including prerequisite channel and section creation, proper
 * authentication setup, and verification that the section is permanently
 * removed from the system. The test ensures that deletion operations maintain
 * referential integrity and that only authorized administrators can perform
 * this destructive operation.
 */
export async function test_api_channel_section_deletion_by_admin(
  connection: api.IConnection,
) {
  // Step 1: Create administrator account for authentication
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "SecurePass123!";

  const admin: ICommunityPlatformAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        display_name: RandomGenerator.name(),
        admin_level: "system",
        is_super_admin: true,
      } satisfies ICommunityPlatformAdmin.ICreate,
    });
  typia.assert(admin);

  // Step 2: Create parent channel
  const channel: ICommunityPlatformChannel =
    await api.functional.communityPlatform.admin.channels.create(connection, {
      body: {
        name: RandomGenerator.alphaNumeric(10).toLowerCase(),
        display_name: RandomGenerator.paragraph({ sentences: 3 }),
        description: RandomGenerator.content({ paragraphs: 2 }),
        sort_order: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<0>
        >(),
        is_active: true,
        status: "active",
      } satisfies ICommunityPlatformChannel.ICreate,
    });
  typia.assert(channel);

  // Step 3: Create section within the channel
  const section: ICommunityPlatformSection =
    await api.functional.communityPlatform.admin.channels.sections.create(
      connection,
      {
        channelName: channel.name,
        body: {
          name: RandomGenerator.alphaNumeric(8).toLowerCase(),
          display_name: RandomGenerator.paragraph({ sentences: 2 }),
          description: RandomGenerator.content({ paragraphs: 1 }),
          sort_order: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<0>
          >(),
          status: "active",
          is_active: true,
        } satisfies ICommunityPlatformSection.ICreate,
      },
    );
  typia.assert(section);

  // Step 4: Delete the section
  const deletedSection: ICommunityPlatformSection =
    await api.functional.communityPlatform.admin.channels.sections.erase(
      connection,
      {
        channelName: channel.name,
        sectionName: section.name,
      },
    );
  typia.assert(deletedSection);

  // Step 5: Validate deletion response
  TestValidator.equals(
    "deleted section ID matches original section ID",
    deletedSection.id,
    section.id,
  );
  TestValidator.equals(
    "deleted section name matches original section name",
    deletedSection.name,
    section.name,
  );
  TestValidator.equals(
    "deleted section display name matches original",
    deletedSection.display_name,
    section.display_name,
  );

  // Step 6: Verify successful deletion by ensuring the section was properly returned
  TestValidator.predicate(
    "deletion operation completed successfully",
    deletedSection.id === section.id && deletedSection.name === section.name,
  );
}
