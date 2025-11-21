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
 * Test comprehensive configuration updates for shopping mall sections.
 *
 * This E2E test validates that section-specific settings, display options, and
 * behavioral configurations can be modified through update operations. Ensures
 * that configuration JSON is properly validated, stored, and applied to section
 * behavior within the channel context.
 *
 * The test follows a complete workflow:
 *
 * 1. Administrator authentication setup
 * 2. Channel creation for section hosting
 * 3. Initial section creation with basic configuration
 * 4. Comprehensive configuration updates
 * 5. Validation of persisted changes
 */
export async function test_api_channel_section_configuration_update(
  connection: api.IConnection,
) {
  // Step 1: Create administrator account for authentication
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: "AdminPassword123!",
      first_name: RandomGenerator.name(1),
      last_name: RandomGenerator.name(1),
      role: "super_admin",
      permissions: JSON.stringify({
        channel_management: true,
        section_management: true,
        configuration_management: true,
      }),
      status: "active",
    } satisfies IShoppingMallAdministrator.ICreate,
  });
  typia.assert(admin);

  // Step 2: Create a shopping channel to host sections
  const channelCode = RandomGenerator.alphaNumeric(8).toLowerCase();
  const channel = await api.functional.shoppingMall.admin.channels.create(
    connection,
    {
      body: {
        code: channelCode,
        name: RandomGenerator.paragraph({ sentences: 3 }),
        description: RandomGenerator.content({ paragraphs: 2 }),
        status: "active",
        configuration: JSON.stringify({
          theme: "modern",
          layout: "grid",
          maxSections: 20,
        }),
      } satisfies IShoppingMallChannel.ICreate,
    },
  );
  typia.assert(channel);

  // Step 3: Create an initial section with basic configuration
  const sectionCode = RandomGenerator.alphaNumeric(6).toLowerCase();
  const initialSection =
    await api.functional.shoppingMall.admin.channels.sections.create(
      connection,
      {
        channelCode: channelCode,
        body: {
          code: sectionCode,
          name: "Initial Section",
          description: "Initial section description for testing",
          display_order: 1,
          status: "active",
          configuration: JSON.stringify({
            displayMode: "list",
            itemsPerPage: 10,
            sortBy: "name",
            filterEnabled: true,
          }),
        } satisfies IShoppingMallSection.ICreate,
      },
    );
  typia.assert(initialSection);

  // Step 4: Perform comprehensive configuration updates
  const updatedSection =
    await api.functional.shoppingMall.admin.channels.sections.update(
      connection,
      {
        channelCode: channelCode,
        sectionCode: sectionCode,
        body: {
          name: "Updated Section Name",
          description: "Updated section description with enhanced features",
          display_order: 2,
          status: "hidden",
          configuration: JSON.stringify({
            displayMode: "grid",
            itemsPerPage: 20,
            sortBy: "price",
            filterEnabled: false,
          }),
        } satisfies IShoppingMallSection.IUpdate,
      },
    );
  typia.assert(updatedSection);

  // Step 5: Validate that all updates are properly persisted
  TestValidator.equals(
    "section name should be updated",
    updatedSection.name,
    "Updated Section Name",
  );
  TestValidator.equals(
    "section description should be updated",
    updatedSection.description,
    "Updated section description with enhanced features",
  );
  TestValidator.equals(
    "display order should be updated",
    updatedSection.display_order,
    2,
  );
  TestValidator.equals(
    "status should be updated",
    updatedSection.status,
    "hidden",
  );

  // Validate configuration JSON parsing and structure
  const parsedConfig = JSON.parse(updatedSection.configuration ?? "{}");
  TestValidator.equals(
    "displayMode should be updated",
    parsedConfig.displayMode,
    "grid",
  );
  TestValidator.equals(
    "itemsPerPage should be updated",
    parsedConfig.itemsPerPage,
    20,
  );
  TestValidator.equals(
    "sortBy should be updated",
    parsedConfig.sortBy,
    "price",
  );
  TestValidator.predicate(
    "filterEnabled should be false",
    parsedConfig.filterEnabled === false,
  );

  // Step 6: Test timestamp updates
  TestValidator.notEquals(
    "updated_at should be different from created_at",
    updatedSection.updated_at,
    initialSection.created_at,
  );
  TestValidator.predicate(
    "updated_at should be after created_at",
    new Date(updatedSection.updated_at) > new Date(initialSection.created_at),
  );

  // Step 7: Test partial updates (only update specific fields)
  const partiallyUpdatedSection =
    await api.functional.shoppingMall.admin.channels.sections.update(
      connection,
      {
        channelCode: channelCode,
        sectionCode: sectionCode,
        body: {
          status: "active",
        } satisfies IShoppingMallSection.IUpdate,
      },
    );
  typia.assert(partiallyUpdatedSection);

  // Validate partial update preserved other fields
  TestValidator.equals(
    "name should remain unchanged after partial update",
    partiallyUpdatedSection.name,
    "Updated Section Name",
  );
  TestValidator.equals(
    "description should remain unchanged after partial update",
    partiallyUpdatedSection.description,
    "Updated section description with enhanced features",
  );
  TestValidator.equals(
    "display_order should remain unchanged after partial update",
    partiallyUpdatedSection.display_order,
    2,
  );
  TestValidator.equals(
    "status should be updated in partial update",
    partiallyUpdatedSection.status,
    "active",
  );

  // Step 8: Test configuration-only update
  const configOnlyUpdate =
    await api.functional.shoppingMall.admin.channels.sections.update(
      connection,
      {
        channelCode: channelCode,
        sectionCode: sectionCode,
        body: {
          configuration: JSON.stringify({
            displayMode: "carousel",
            itemsPerPage: 5,
            sortBy: "popularity",
            autoPlay: true,
            autoPlayInterval: 5000,
          }),
        } satisfies IShoppingMallSection.IUpdate,
      },
    );
  typia.assert(configOnlyUpdate);

  // Validate configuration-only update
  const finalConfig = JSON.parse(configOnlyUpdate.configuration ?? "{}");
  TestValidator.equals(
    "displayMode should be carousel",
    finalConfig.displayMode,
    "carousel",
  );
  TestValidator.equals("itemsPerPage should be 5", finalConfig.itemsPerPage, 5);
  TestValidator.equals(
    "sortBy should be popularity",
    finalConfig.sortBy,
    "popularity",
  );
  TestValidator.predicate(
    "autoPlay should be enabled",
    finalConfig.autoPlay === true,
  );
  TestValidator.equals(
    "autoPlayInterval should be 5000",
    finalConfig.autoPlayInterval,
    5000,
  );

  // Final validation: Ensure all business fields remain consistent
  TestValidator.equals(
    "section ID should remain constant throughout updates",
    configOnlyUpdate.id,
    initialSection.id,
  );
  TestValidator.equals(
    "section code should remain constant",
    configOnlyUpdate.code,
    sectionCode,
  );
  TestValidator.predicate(
    "final updated_at should be most recent",
    new Date(configOnlyUpdate.updated_at) >
      new Date(partiallyUpdatedSection.updated_at),
  );

  // Test error scenario: Invalid configuration JSON
  await TestValidator.error(
    "invalid JSON configuration should fail",
    async () => {
      await api.functional.shoppingMall.admin.channels.sections.update(
        connection,
        {
          channelCode: channelCode,
          sectionCode: sectionCode,
          body: {
            configuration: "invalid json format",
          } satisfies IShoppingMallSection.IUpdate,
        },
      );
    },
  );
}
