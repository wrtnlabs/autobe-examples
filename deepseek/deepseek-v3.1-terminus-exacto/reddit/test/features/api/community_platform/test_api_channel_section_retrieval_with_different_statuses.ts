import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAuthorizationToken";
import type { ICommunityPlatformChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformChannel";
import type { ICommunityPlatformSection } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSection";

/**
 * Test section retrieval across different workflow statuses to validate proper
 * access control and information visibility. Tests include retrieving active
 * sections that should be publicly accessible, draft sections that may have
 * restricted visibility, and archived sections for historical reference.
 * Validates that section status affects what information is returned and
 * ensures proper handling of section lifecycle states in public retrieval
 * operations.
 */
export async function test_api_channel_section_retrieval_with_different_statuses(
  connection: api.IConnection,
) {
  // 1. Create administrator account for authentication
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin: ICommunityPlatformAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: "AdminPassword123!",
        display_name: RandomGenerator.name(),
        admin_level: "content",
        is_super_admin: false,
      } satisfies ICommunityPlatformAdmin.ICreate,
    });
  typia.assert(admin);

  // 2. Create a test channel
  const channel: ICommunityPlatformChannel =
    await api.functional.communityPlatform.admin.channels.create(connection, {
      body: {
        name: RandomGenerator.alphabets(10),
        display_name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.content({ paragraphs: 1 }),
        icon_url: undefined,
        banner_url: undefined,
        sort_order: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<0>
        >(),
        is_active: true,
        status: "active",
      } satisfies ICommunityPlatformChannel.ICreate,
    });
  typia.assert(channel);

  // 3. Create sections with different statuses
  const statuses = ["active", "draft", "archived", "suspended"] as const;
  const sections: ICommunityPlatformSection[] = [];

  for (const status of statuses) {
    const section: ICommunityPlatformSection =
      await api.functional.communityPlatform.admin.channels.sections.create(
        connection,
        {
          channelName: channel.name,
          body: {
            name: RandomGenerator.alphabets(8),
            display_name: RandomGenerator.paragraph({ sentences: 2 }),
            description: RandomGenerator.content({ paragraphs: 1 }),
            icon_url: undefined,
            sort_order: typia.random<
              number & tags.Type<"int32"> & tags.Minimum<0>
            >(),
            status: status,
            is_active: status === "active" || status === "draft",
          } satisfies ICommunityPlatformSection.ICreate,
        },
      );
    typia.assert(section);
    sections.push(section);
  }

  // 4. Validate retrieval of each section
  for (const section of sections) {
    const retrievedSection: ICommunityPlatformSection =
      await api.functional.communityPlatform.channels.sections.at(connection, {
        channelName: channel.name,
        sectionName: section.name,
      });
    typia.assert(retrievedSection);

    // Validate that retrieved section matches created section
    TestValidator.equals(
      "section ID should match",
      retrievedSection.id,
      section.id,
    );
    TestValidator.equals(
      "section name should match",
      retrievedSection.name,
      section.name,
    );
    TestValidator.equals(
      "section display name should match",
      retrievedSection.display_name,
      section.display_name,
    );
    TestValidator.equals(
      "section status should match",
      retrievedSection.status,
      section.status,
    );
    TestValidator.equals(
      "section is_active should match",
      retrievedSection.is_active,
      section.is_active,
    );

    // Validate section relationships
    TestValidator.equals(
      "channel ID should match",
      retrievedSection.channel.id,
      channel.id,
    );
    TestValidator.equals(
      "channel name should match",
      retrievedSection.channel.name,
      channel.name,
    );
    TestValidator.predicate(
      "created_by should be defined",
      retrievedSection.created_by !== undefined,
    );
    TestValidator.equals(
      "created_by admin ID should match",
      retrievedSection.created_by.id,
      admin.id,
    );
  }

  // 5. Test error handling for non-existent section
  await TestValidator.error(
    "retrieving non-existent section should fail",
    async () => {
      await api.functional.communityPlatform.channels.sections.at(connection, {
        channelName: channel.name,
        sectionName: "non-existent-section",
      });
    },
  );
}
