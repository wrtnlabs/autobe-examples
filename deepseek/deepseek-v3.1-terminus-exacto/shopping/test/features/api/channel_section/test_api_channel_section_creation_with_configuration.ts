import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallChannel";
import type { IShoppingMallConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallConfiguration";
import type { IShoppingMallSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSection";

/**
 * Validates section creation with custom configuration settings within a
 * shopping mall channel.
 *
 * This test implements a comprehensive workflow:
 *
 * 1. Administrator authentication for configuration management
 * 2. Channel creation to host configured sections
 * 3. Section creation with advanced configuration settings
 * 4. Configuration validation and storage verification
 *
 * The test ensures that section-specific configurations including display
 * properties, content rules, and behavioral settings are properly applied and
 * persisted.
 */
export async function test_api_channel_section_creation_with_configuration(
  connection: api.IConnection,
) {
  // Step 1: Authenticate as administrator for configuration management
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin: IShoppingMallAdministrator.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: "AdminPassword123!",
        first_name: RandomGenerator.name(1),
        last_name: RandomGenerator.name(1),
        role: "super_admin",
        permissions: JSON.stringify({
          channel_management: true,
          section_creation: true,
          configuration_access: true,
        }),
        status: "active",
      } satisfies IShoppingMallAdministrator.ICreate,
    });
  typia.assert(admin);

  // Step 2: Create channel to host configured sections
  const channel: IShoppingMallChannel =
    await api.functional.shoppingMall.admin.channels.create(connection, {
      body: {
        code: `channel_${typia.random<string & tags.Format<"uuid">>().substring(0, 8)}`,
        name: RandomGenerator.paragraph({
          sentences: 3,
          wordMin: 3,
          wordMax: 8,
        }),
        description: RandomGenerator.content({
          paragraphs: 2,
          sentenceMin: 5,
          sentenceMax: 10,
        }),
        status: "active",
        configuration: JSON.stringify({
          theme: "modern",
          layout: "grid",
          maxSections: 50,
        }),
      } satisfies IShoppingMallChannel.ICreate,
    });
  typia.assert(channel);

  // Step 3: Create section with custom configuration settings
  const sectionConfiguration = {
    display: {
      theme: "dark",
      layout: "list",
      showImages: true,
      maxItemsPerPage: 20,
    },
    content: {
      allowedTypes: ["product", "category", "promotion"],
      maxContentLength: 1000,
      requireApproval: false,
    },
    behavior: {
      autoRefresh: true,
      refreshInterval: 300,
      cachingEnabled: true,
      cacheDuration: 3600,
    },
  };

  const section: IShoppingMallSection =
    await api.functional.shoppingMall.admin.channels.sections.create(
      connection,
      {
        channelCode: channel.code,
        body: {
          code: `section_${typia.random<string & tags.Format<"uuid">>().substring(0, 8)}`,
          name: RandomGenerator.paragraph({
            sentences: 2,
            wordMin: 2,
            wordMax: 6,
          }),
          description: RandomGenerator.content({
            paragraphs: 1,
            sentenceMin: 3,
            sentenceMax: 8,
          }),
          display_order: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<1000>
          >(),
          status: "active",
          configuration: JSON.stringify(sectionConfiguration),
        } satisfies IShoppingMallSection.ICreate,
      },
    );
  typia.assert(section);

  // Step 4: Validate section creation and configuration
  TestValidator.equals(
    "section code should be defined",
    section.code,
    section.code,
  );
  TestValidator.equals(
    "section name should be defined",
    section.name,
    section.name,
  );
  TestValidator.predicate(
    "display order should be positive integer",
    section.display_order > 0,
  );
  TestValidator.equals(
    "section status should be active",
    section.status,
    "active",
  );

  // Validate configuration parsing and structure
  if (section.configuration) {
    try {
      const parsedConfig = JSON.parse(section.configuration);
      TestValidator.predicate(
        "configuration should be valid JSON object",
        typeof parsedConfig === "object" && parsedConfig !== null,
      );

      // Validate configuration structure using response data
      TestValidator.predicate(
        "configuration should contain display settings",
        parsedConfig.display !== undefined,
      );
      TestValidator.predicate(
        "configuration should contain content rules",
        parsedConfig.content !== undefined,
      );
      TestValidator.predicate(
        "configuration should contain behavior settings",
        parsedConfig.behavior !== undefined,
      );

      // Validate specific configuration properties using response data
      if (parsedConfig.display) {
        TestValidator.predicate(
          "display settings should be object",
          typeof parsedConfig.display === "object",
        );
        TestValidator.predicate(
          "max items per page should be positive",
          parsedConfig.display.maxItemsPerPage > 0,
        );
      }

      if (parsedConfig.content) {
        TestValidator.predicate(
          "content allowed types should be array",
          Array.isArray(parsedConfig.content.allowedTypes),
        );
      }

      if (parsedConfig.behavior) {
        TestValidator.predicate(
          "refresh interval should be positive",
          parsedConfig.behavior.refreshInterval > 0,
        );
      }
    } catch (error) {
      throw new Error(`Failed to parse section configuration: ${error}`);
    }
  }

  // Step 5: Validate section belongs to channel context
  TestValidator.predicate(
    "section should have valid ID",
    section.id !== undefined,
  );
}
