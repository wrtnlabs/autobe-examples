import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAuthorizationToken";
import type { ICommunityPlatformChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformChannel";
import type { ICommunityPlatformSection } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSection";

/**
 * Test public retrieval of channel sections without authentication requirements
 *
 * This E2E test validates that any user can access section details within a
 * channel without requiring authentication. It creates test data including an
 * administrator account, a parent channel, and multiple sections with different
 * statuses to test comprehensive access control and information retrieval.
 */
export async function test_api_channel_section_public_retrieval(
  connection: api.IConnection,
) {
  // 1. Create administrator account for test data setup
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: "admin123",
      display_name: RandomGenerator.name(),
      admin_level: "system",
      is_super_admin: true,
    } satisfies ICommunityPlatformAdmin.ICreate,
  });
  typia.assert(admin);

  // 2. Create parent channel to host sections
  const channel = await api.functional.communityPlatform.admin.channels.create(
    connection,
    {
      body: {
        name: RandomGenerator.alphabets(10),
        display_name: RandomGenerator.name(),
        description: RandomGenerator.paragraph({ sentences: 3 }),
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

  // 3. Create multiple sections with different statuses
  const sectionStatuses = ["active", "draft", "archived"] as const;
  const sections: ICommunityPlatformSection[] = [];

  for (const status of sectionStatuses) {
    const section =
      await api.functional.communityPlatform.admin.channels.sections.create(
        connection,
        {
          channelName: channel.name,
          body: {
            name: RandomGenerator.alphabets(8),
            display_name: RandomGenerator.name(),
            description: RandomGenerator.paragraph({ sentences: 2 }),
            icon_url: typia.random<string & tags.Format<"uri">>(),
            sort_order: typia.random<
              number & tags.Type<"int32"> & tags.Minimum<0>
            >(),
            status: status,
            is_active: status === "active",
          } satisfies ICommunityPlatformSection.ICreate,
        },
      );
    typia.assert(section);
    sections.push(section);
  }

  // 4. Test public retrieval of sections without authentication
  // Create unauthenticated connection for public access testing
  const unauthConn: api.IConnection = { ...connection, headers: {} };

  for (const section of sections) {
    const retrievedSection =
      await api.functional.communityPlatform.channels.sections.at(unauthConn, {
        channelName: channel.name,
        sectionName: section.name,
      });
    typia.assert(retrievedSection);

    // Validate section details are correctly returned
    TestValidator.equals(
      "section ID should match created section",
      retrievedSection.id,
      section.id,
    );
    TestValidator.equals(
      "section name should match created section",
      retrievedSection.name,
      section.name,
    );
    TestValidator.equals(
      "display name should match created section",
      retrievedSection.display_name,
      section.display_name,
    );
    TestValidator.equals(
      "description should match created section",
      retrievedSection.description,
      section.description,
    );
    TestValidator.equals(
      "sort order should match created section",
      retrievedSection.sort_order,
      section.sort_order,
    );
    TestValidator.equals(
      "status should match created section",
      retrievedSection.status,
      section.status,
    );
    TestValidator.equals(
      "is_active should match created section",
      retrievedSection.is_active,
      section.is_active,
    );

    // Validate channel relationship
    TestValidator.equals(
      "channel ID should match parent channel",
      retrievedSection.channel.id,
      channel.id,
    );
    TestValidator.equals(
      "channel name should match parent channel",
      retrievedSection.channel.name,
      channel.name,
    );

    // Validate administrator tracking
    TestValidator.equals(
      "created by admin ID should match",
      retrievedSection.created_by.id,
      admin.id,
    );
    TestValidator.equals(
      "created by display name should match",
      retrievedSection.created_by.display_name,
      admin.display_name,
    );
  }

  // 5. Test error case: non-existent section
  await TestValidator.error(
    "retrieving non-existent section should fail",
    async () => {
      await api.functional.communityPlatform.channels.sections.at(unauthConn, {
        channelName: channel.name,
        sectionName: "non-existent-section",
      });
    },
  );
}
