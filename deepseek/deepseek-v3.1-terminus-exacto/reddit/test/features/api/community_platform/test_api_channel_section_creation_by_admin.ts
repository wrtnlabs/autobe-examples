import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAuthorizationToken";
import type { ICommunityPlatformChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformChannel";
import type { ICommunityPlatformSection } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSection";

/**
 * Test the creation of a new organizational section within an existing channel
 * by an authenticated administrator.
 *
 * This comprehensive E2E test validates the complete workflow of section
 * creation within the community platform:
 *
 * 1. Administrator authentication and authorization establishment
 * 2. Parent channel creation as the organizational container
 * 3. Section creation with proper configuration and validation
 * 4. Hierarchical relationship verification between channel and section
 *
 * The test ensures that administrators can successfully create sections with
 * appropriate display properties, sorting order, status configuration, and
 * audit trail information while maintaining data integrity throughout the
 * hierarchical organizational structure.
 */
export async function test_api_channel_section_creation_by_admin(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate as administrator
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin: ICommunityPlatformAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: "AdminPassword123!",
        display_name: RandomGenerator.paragraph({ sentences: 2 }),
        admin_level: "system",
        is_super_admin: true,
      } satisfies ICommunityPlatformAdmin.ICreate,
    });
  typia.assert(admin);

  // Step 2: Create parent channel that will contain the section
  const channel: ICommunityPlatformChannel =
    await api.functional.communityPlatform.admin.channels.create(connection, {
      body: {
        name: RandomGenerator.alphabets(10),
        display_name: RandomGenerator.paragraph({ sentences: 3 }),
        description: RandomGenerator.content({
          paragraphs: 1,
          sentenceMin: 5,
          sentenceMax: 8,
        }),
        icon_url: typia.random<string & tags.Format<"uri">>(),
        banner_url: typia.random<string & tags.Format<"uri">>(),
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
          name: RandomGenerator.alphabets(8),
          display_name: RandomGenerator.paragraph({ sentences: 3 }),
          description: RandomGenerator.content({
            paragraphs: 1,
            sentenceMin: 5,
            sentenceMax: 8,
          }),
          icon_url: typia.random<string & tags.Format<"uri">>(),
          sort_order: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<0>
          >(),
          status: "active",
          is_active: true,
        } satisfies ICommunityPlatformSection.ICreate,
      },
    );
  typia.assert(section);

  // Step 4: Validate section properties and relationships
  // typia.assert already validates all properties, so focus on business logic validations
  TestValidator.predicate(
    "section has valid creation timestamp",
    section.created_at !== null && section.created_at !== undefined,
  );
  TestValidator.predicate(
    "section has valid update timestamp",
    section.updated_at !== null && section.updated_at !== undefined,
  );

  // Validate hierarchical relationship with parent channel
  TestValidator.equals(
    "section channel ID matches parent channel",
    section.channel.id,
    channel.id,
  );
  TestValidator.equals(
    "section channel name matches parent channel",
    section.channel.name,
    channel.name,
  );

  // Validate audit trail information
  TestValidator.predicate(
    "section has created_by administrator",
    section.created_by !== null && section.created_by !== undefined,
  );
  TestValidator.equals(
    "created_by admin ID matches authenticated admin",
    section.created_by.id,
    admin.id,
  );

  // Validate that section inherits channel-level settings appropriately
  TestValidator.predicate(
    "section and channel have consistent active status",
    section.is_active === channel.is_active,
  );

  // Test error scenario: Attempt to create section with duplicate name
  await TestValidator.error(
    "should fail when creating section with duplicate name",
    async () => {
      await api.functional.communityPlatform.admin.channels.sections.create(
        connection,
        {
          channelName: channel.name,
          body: {
            name: section.name, // Duplicate name
            display_name: RandomGenerator.paragraph({ sentences: 3 }),
            description: RandomGenerator.content({
              paragraphs: 1,
              sentenceMin: 5,
              sentenceMax: 8,
            }),
            sort_order: typia.random<
              number & tags.Type<"int32"> & tags.Minimum<0>
            >(),
            status: "active",
            is_active: true,
          } satisfies ICommunityPlatformSection.ICreate,
        },
      );
    },
  );

  // Test creating section with different status values
  const draftSection: ICommunityPlatformSection =
    await api.functional.communityPlatform.admin.channels.sections.create(
      connection,
      {
        channelName: channel.name,
        body: {
          name: RandomGenerator.alphabets(8),
          display_name: RandomGenerator.paragraph({ sentences: 3 }),
          description: RandomGenerator.content({
            paragraphs: 1,
            sentenceMin: 5,
            sentenceMax: 8,
          }),
          sort_order: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<0>
          >(),
          status: "draft",
          is_active: false,
        } satisfies ICommunityPlatformSection.ICreate,
      },
    );
  typia.assert(draftSection);
  TestValidator.equals(
    "draft section status is correct",
    draftSection.status,
    "draft",
  );
  TestValidator.predicate("draft section is inactive", !draftSection.is_active);
}
