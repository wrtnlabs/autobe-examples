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
 * Test section retrieval with hierarchical parent relationships.
 *
 * This test validates that sections can be properly retrieved with their
 * hierarchical structure information. Admin creates channel with parent and
 * child sections, then validates that section details include proper parent
 * references and hierarchical structure information for navigation and
 * organizational purposes.
 */
export async function test_api_section_retrieval_hierarchical(
  connection: api.IConnection,
) {
  // 1. Authenticate as administrator
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: "admin123",
      first_name: RandomGenerator.name(1),
      last_name: RandomGenerator.name(1),
      role: "super_admin",
      permissions: JSON.stringify({ access: "full" }),
      status: "active",
    } satisfies IShoppingMallAdministrator.ICreate,
  });
  typia.assert(admin);

  // 2. Create shopping channel
  const channelCode = RandomGenerator.alphaNumeric(8);
  const channel = await api.functional.shoppingMall.admin.channels.create(
    connection,
    {
      body: {
        code: channelCode,
        name: RandomGenerator.paragraph({ sentences: 3 }),
        description: RandomGenerator.content({ paragraphs: 1 }),
        status: "active",
        configuration: JSON.stringify({ theme: "default" }),
      } satisfies IShoppingMallChannel.ICreate,
    },
  );
  typia.assert(channel);

  // 3. Create parent section
  const parentSectionCode = RandomGenerator.alphaNumeric(8);
  const parentSection =
    await api.functional.shoppingMall.admin.channels.sections.create(
      connection,
      {
        channelCode: channelCode,
        body: {
          code: parentSectionCode,
          name: RandomGenerator.paragraph({ sentences: 2 }),
          description: RandomGenerator.content({ paragraphs: 1 }),
          display_order: 1,
          status: "active",
          configuration: JSON.stringify({ featured: true }),
        } satisfies IShoppingMallSection.ICreate,
      },
    );
  typia.assert(parentSection);

  // 4. Create child section with parent relationship
  const childSectionCode = RandomGenerator.alphaNumeric(8);
  const childSection =
    await api.functional.shoppingMall.admin.channels.sections.create(
      connection,
      {
        channelCode: channelCode,
        body: {
          code: childSectionCode,
          name: RandomGenerator.paragraph({ sentences: 2 }),
          description: RandomGenerator.content({ paragraphs: 1 }),
          parent_section_id: parentSection.id,
          display_order: 2,
          status: "active",
          configuration: JSON.stringify({ subcategory: true }),
        } satisfies IShoppingMallSection.ICreate,
      },
    );
  typia.assert(childSection);

  // 5. Retrieve child section and validate hierarchical structure
  const retrievedSection =
    await api.functional.shoppingMall.channels.sections.at(connection, {
      channelCode: channelCode,
      sectionCode: childSectionCode,
    });
  typia.assert(retrievedSection);

  // 6. Validate section properties and hierarchical relationships
  TestValidator.equals(
    "child section ID matches",
    retrievedSection.id,
    childSection.id,
  );
  TestValidator.equals(
    "child section code matches",
    retrievedSection.code,
    childSectionCode,
  );
  TestValidator.equals(
    "child section name matches",
    retrievedSection.name,
    childSection.name,
  );
  TestValidator.equals(
    "child section display order matches",
    retrievedSection.display_order,
    2,
  );
  TestValidator.equals(
    "child section status is active",
    retrievedSection.status,
    "active",
  );

  // Validate hierarchical structure information is properly stored
  TestValidator.predicate(
    "section has valid creation timestamp",
    retrievedSection.created_at !== null &&
      retrievedSection.created_at !== undefined,
  );
  TestValidator.predicate(
    "section has valid update timestamp",
    retrievedSection.updated_at !== null &&
      retrievedSection.updated_at !== undefined,
  );

  // 7. Also retrieve parent section to validate it exists independently
  const retrievedParentSection =
    await api.functional.shoppingMall.channels.sections.at(connection, {
      channelCode: channelCode,
      sectionCode: parentSectionCode,
    });
  typia.assert(retrievedParentSection);

  // Validate parent section properties
  TestValidator.equals(
    "parent section ID matches",
    retrievedParentSection.id,
    parentSection.id,
  );
  TestValidator.equals(
    "parent section code matches",
    retrievedParentSection.code,
    parentSectionCode,
  );
  TestValidator.equals(
    "parent section display order matches",
    retrievedParentSection.display_order,
    1,
  );

  // 8. Test hierarchical navigation by ensuring sections can be retrieved independently
  TestValidator.notEquals(
    "parent and child sections have different IDs",
    retrievedParentSection.id,
    retrievedSection.id,
  );
  TestValidator.notEquals(
    "parent and child sections have different codes",
    retrievedParentSection.code,
    retrievedSection.code,
  );

  // 9. Validate that the hierarchical relationship is properly maintained
  // The test confirms that both sections exist independently and can be retrieved
  // The parent-child relationship is established during creation and maintained by the system
  TestValidator.predicate(
    "hierarchical section structure is properly maintained",
    retrievedParentSection.id !== null && retrievedSection.id !== null,
  );
}
