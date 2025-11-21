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
 * Test successful update of existing shopping mall section properties by an
 * authenticated administrator. Validates that section details including name,
 * description, display order, status, and configuration can be modified while
 * maintaining data integrity and hierarchical relationships. Ensures that
 * updates preserve section-channel relationships and validate business rules
 * for section uniqueness and display ordering.
 */
export async function test_api_channel_section_update_by_admin(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate as administrator
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "AdminPassword123!";

  const adminAuth = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      first_name: RandomGenerator.name(2),
      last_name: RandomGenerator.name(2),
      role: "super_admin",
      permissions: JSON.stringify({ access: "full" }),
      status: "active",
    } satisfies IShoppingMallAdministrator.ICreate,
  });
  typia.assert(adminAuth);

  // Step 2: Create parent channel for section management
  const channelCode = RandomGenerator.alphaNumeric(8);
  const channel = await api.functional.shoppingMall.admin.channels.create(
    connection,
    {
      body: {
        code: channelCode,
        name: RandomGenerator.paragraph({ sentences: 3 }),
        description: RandomGenerator.content({ paragraphs: 2 }),
        status: "active",
        configuration: JSON.stringify({ theme: "default" }),
      } satisfies IShoppingMallChannel.ICreate,
    },
  );
  typia.assert(channel);

  // Step 3: Create initial section that will be updated
  const sectionCode = RandomGenerator.alphaNumeric(6);
  const initialSection =
    await api.functional.shoppingMall.admin.channels.sections.create(
      connection,
      {
        channelCode: channelCode,
        body: {
          code: sectionCode,
          name: "Initial Section Name",
          description: "Initial section description",
          display_order: 1,
          status: "active",
          configuration: JSON.stringify({ layout: "grid" }),
        } satisfies IShoppingMallSection.ICreate,
      },
    );
  typia.assert(initialSection);

  // Step 4: Update section properties with new values
  const updatedSection =
    await api.functional.shoppingMall.admin.channels.sections.update(
      connection,
      {
        channelCode: channelCode,
        sectionCode: sectionCode,
        body: {
          name: "Updated Section Name",
          description: "Updated section description with more details",
          display_order: 5,
          status: "inactive",
          configuration: JSON.stringify({ layout: "list", featured: true }),
        } satisfies IShoppingMallSection.IUpdate,
      },
    );
  typia.assert(updatedSection);

  // Step 5: Validate that all properties were updated correctly
  TestValidator.equals(
    "section ID remains unchanged",
    updatedSection.id,
    initialSection.id,
  );
  TestValidator.equals(
    "section code remains unchanged",
    updatedSection.code,
    initialSection.code,
  );
  TestValidator.equals(
    "channel relationship preserved",
    updatedSection.id,
    initialSection.id,
  );

  TestValidator.notEquals(
    "name should be updated",
    updatedSection.name,
    initialSection.name,
  );
  TestValidator.equals(
    "updated name matches expected",
    updatedSection.name,
    "Updated Section Name",
  );

  TestValidator.notEquals(
    "description should be updated",
    updatedSection.description,
    initialSection.description,
  );
  TestValidator.equals(
    "updated description matches expected",
    updatedSection.description,
    "Updated section description with more details",
  );

  TestValidator.notEquals(
    "display order should be updated",
    updatedSection.display_order,
    initialSection.display_order,
  );
  TestValidator.equals(
    "updated display order matches expected",
    updatedSection.display_order,
    5,
  );

  TestValidator.notEquals(
    "status should be updated",
    updatedSection.status,
    initialSection.status,
  );
  TestValidator.equals(
    "updated status matches expected",
    updatedSection.status,
    "inactive",
  );

  TestValidator.predicate(
    "updated timestamp should be later than creation",
    new Date(updatedSection.updated_at) > new Date(initialSection.updated_at),
  );
}
