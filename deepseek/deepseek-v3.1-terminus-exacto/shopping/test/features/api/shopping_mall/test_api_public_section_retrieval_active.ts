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
 * Test public retrieval of active shopping mall sections.
 *
 * Validates that public users can access active sections with complete
 * configuration details, hierarchical relationships, and display properties for
 * customer-facing interfaces without requiring authentication.
 */
export async function test_api_public_section_retrieval_active(
  connection: api.IConnection,
) {
  // Step 1: Create administrator account for test data setup
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "AdminPassword123!";

  const admin: IShoppingMallAdministrator.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        first_name: RandomGenerator.name(1),
        last_name: RandomGenerator.name(1),
        role: "super_admin",
        permissions: JSON.stringify({ access: "full" }),
        status: "active",
      } satisfies IShoppingMallAdministrator.ICreate,
    });
  typia.assert(admin);

  // Step 2: Create shopping mall channel
  const channelCode = RandomGenerator.alphaNumeric(8).toLowerCase();
  const channelName = RandomGenerator.paragraph({ sentences: 3 });

  const channel: IShoppingMallChannel =
    await api.functional.shoppingMall.admin.channels.create(connection, {
      body: {
        code: channelCode,
        name: channelName,
        description: RandomGenerator.content({ paragraphs: 1 }),
        status: "active",
        configuration: JSON.stringify({ theme: "default", layout: "grid" }),
      } satisfies IShoppingMallChannel.ICreate,
    });
  typia.assert(channel);

  // Step 3: Create active section within the channel
  const sectionCode = RandomGenerator.alphaNumeric(6).toLowerCase();
  const sectionName = RandomGenerator.paragraph({ sentences: 2 });

  const section: IShoppingMallSection =
    await api.functional.shoppingMall.admin.channels.sections.create(
      connection,
      {
        channelCode: channel.code,
        body: {
          code: sectionCode,
          name: sectionName,
          description: RandomGenerator.content({ paragraphs: 2 }),
          display_order: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
          >(),
          status: "active",
          configuration: JSON.stringify({
            display: "list",
            sort: "name_asc",
            filter: { category: "all" },
          }),
        } satisfies IShoppingMallSection.ICreate,
      },
    );
  typia.assert(section);

  // Step 4: Test public retrieval without authentication
  // Create unauthenticated connection for public access test
  const publicConnection: api.IConnection = { ...connection, headers: {} };

  const retrievedSection: IShoppingMallSection =
    await api.functional.shoppingMall.channels.sections.at(publicConnection, {
      channelCode: channel.code,
      sectionCode: section.code,
    });
  typia.assert(retrievedSection);

  // Step 5: Validate that retrieved section matches created section
  TestValidator.equals(
    "section ID should match",
    retrievedSection.id,
    section.id,
  );
  TestValidator.equals(
    "section code should match",
    retrievedSection.code,
    section.code,
  );
  TestValidator.equals(
    "section name should match",
    retrievedSection.name,
    section.name,
  );
  TestValidator.equals(
    "section description should match",
    retrievedSection.description,
    section.description,
  );
  TestValidator.equals(
    "section display order should match",
    retrievedSection.display_order,
    section.display_order,
  );
  TestValidator.equals(
    "section status should be active",
    retrievedSection.status,
    "active",
  );
  TestValidator.equals(
    "section configuration should match",
    retrievedSection.configuration,
    section.configuration,
  );

  // Validate timestamp properties exist and are valid
  TestValidator.predicate(
    "created_at should be valid date string",
    typeof retrievedSection.created_at === "string" &&
      retrievedSection.created_at.length > 0,
  );
  TestValidator.predicate(
    "updated_at should be valid date string",
    typeof retrievedSection.updated_at === "string" &&
      retrievedSection.updated_at.length > 0,
  );
}
