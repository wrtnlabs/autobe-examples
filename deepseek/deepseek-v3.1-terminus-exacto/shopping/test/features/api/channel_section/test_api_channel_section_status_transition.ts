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
 * Test section status transitions and lifecycle management through update
 * operations. Validates that sections can be moved between active, inactive,
 * hidden, and archived states with appropriate business rule enforcement.
 * Ensures that status changes respect channel policies and maintain proper
 * visibility controls for customer-facing interfaces.
 */
export async function test_api_channel_section_status_transition(
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
        user_management: true,
      }),
      status: "active",
    } satisfies IShoppingMallAdministrator.ICreate,
  });
  typia.assert(admin);

  // Step 2: Create a shopping channel for section lifecycle testing
  const channelCode = RandomGenerator.alphaNumeric(8);
  const channel = await api.functional.shoppingMall.admin.channels.create(
    connection,
    {
      body: {
        code: channelCode,
        name: RandomGenerator.paragraph({ sentences: 3 }),
        description: RandomGenerator.content({ paragraphs: 2 }),
        status: "active",
        configuration: JSON.stringify({
          allow_section_creation: true,
          max_sections: 50,
          default_section_status: "active",
        }),
      } satisfies IShoppingMallChannel.ICreate,
    },
  );
  typia.assert(channel);

  // Step 3: Create a section with initial status
  const sectionCode = RandomGenerator.alphaNumeric(8);
  const initialSection =
    await api.functional.shoppingMall.admin.channels.sections.create(
      connection,
      {
        channelCode: channel.code,
        body: {
          code: sectionCode,
          name: RandomGenerator.paragraph({ sentences: 2 }),
          description: RandomGenerator.content({ paragraphs: 1 }),
          display_order: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<1000>
          >(),
          status: "active",
          configuration: JSON.stringify({
            allow_product_addition: true,
            max_products: 1000,
            visibility: "public",
          }),
        } satisfies IShoppingMallSection.ICreate,
      },
    );
  typia.assert(initialSection);
  TestValidator.equals(
    "section should be created with active status",
    initialSection.status,
    "active",
  );

  // Step 4: Test status transitions through update operations
  const statusTransitions = [
    "inactive",
    "hidden",
    "archived",
    "active",
  ] as const;

  // Initialize section variable for the transition loop
  let section = initialSection;

  for (const targetStatus of statusTransitions) {
    // Update section with new status
    const updatedSection =
      await api.functional.shoppingMall.admin.channels.sections.update(
        connection,
        {
          channelCode: channel.code,
          sectionCode: section.code,
          body: {
            status: targetStatus,
          } satisfies IShoppingMallSection.IUpdate,
        },
      );
    typia.assert(updatedSection);

    // Validate that status was properly updated
    TestValidator.equals(
      "section status should be updated",
      updatedSection.status,
      targetStatus,
    );
    TestValidator.equals(
      "section ID should remain the same",
      updatedSection.id,
      initialSection.id,
    );
    TestValidator.equals(
      "section code should remain the same",
      updatedSection.code,
      initialSection.code,
    );
    TestValidator.equals(
      "section name should remain the same",
      updatedSection.name,
      initialSection.name,
    );

    // Verify that other properties are preserved
    TestValidator.equals(
      "display order should be preserved",
      updatedSection.display_order,
      initialSection.display_order,
    );
    TestValidator.equals(
      "description should be preserved",
      updatedSection.description,
      initialSection.description,
    );
    TestValidator.equals(
      "configuration should be preserved",
      updatedSection.configuration,
      initialSection.configuration,
    );

    // Update the current section reference for next iteration
    section = updatedSection;
  }

  // Step 5: Test partial updates with multiple properties
  const finalUpdate =
    await api.functional.shoppingMall.admin.channels.sections.update(
      connection,
      {
        channelCode: channel.code,
        sectionCode: section.code,
        body: {
          name: RandomGenerator.paragraph({ sentences: 2 }),
          display_order: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<1000>
          >(),
          status: "inactive",
          description: RandomGenerator.content({ paragraphs: 1 }),
        } satisfies IShoppingMallSection.IUpdate,
      },
    );
  typia.assert(finalUpdate);

  // Validate final state
  TestValidator.equals(
    "final status should be inactive",
    finalUpdate.status,
    "inactive",
  );
  TestValidator.notEquals(
    "name should be updated",
    finalUpdate.name,
    initialSection.name,
  );
  TestValidator.notEquals(
    "display order should be updated",
    finalUpdate.display_order,
    initialSection.display_order,
  );
  TestValidator.notEquals(
    "description should be updated",
    finalUpdate.description,
    initialSection.description,
  );
  TestValidator.equals(
    "section ID should remain constant",
    finalUpdate.id,
    initialSection.id,
  );
  TestValidator.equals(
    "section code should remain constant",
    finalUpdate.code,
    initialSection.code,
  );
}
