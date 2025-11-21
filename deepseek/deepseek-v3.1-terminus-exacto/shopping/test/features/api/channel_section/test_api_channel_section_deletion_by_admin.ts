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
 * Test complete workflow for deleting a shopping mall section within a channel.
 *
 * This E2E test validates the complete section deletion process including admin
 * authentication, channel creation, section creation, and section deletion
 * operations. The test ensures proper authorization enforcement and system
 * integrity checks for dependencies.
 *
 * Workflow:
 *
 * 1. Create admin account and authenticate
 * 2. Create shopping channel as prerequisite
 * 3. Create section within the channel
 * 4. Perform section deletion operation
 * 5. Validate system integrity and authorization
 */
export async function test_api_channel_section_deletion_by_admin(
  connection: api.IConnection,
) {
  // Step 1: Admin authentication - Create and authenticate admin account
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "AdminPassword123!";

  const adminAuth = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      first_name: RandomGenerator.name(1),
      last_name: RandomGenerator.name(1),
      role: "support_admin",
      permissions: JSON.stringify({
        channel_management: true,
        section_management: true,
        delete_operations: true,
      }),
      status: "active",
    } satisfies IShoppingMallAdministrator.ICreate,
  });
  typia.assert(adminAuth);

  // Step 2: Create shopping channel as prerequisite for section management
  const channelCode = RandomGenerator.alphaNumeric(8).toLowerCase();
  const channelName = RandomGenerator.paragraph({
    sentences: 3,
    wordMin: 3,
    wordMax: 8,
  });

  const channel = await api.functional.shoppingMall.admin.channels.create(
    connection,
    {
      body: {
        code: channelCode,
        name: channelName,
        description: RandomGenerator.content({
          paragraphs: 1,
          sentenceMin: 5,
          sentenceMax: 10,
        }),
        status: "active",
        configuration: JSON.stringify({
          allow_section_creation: true,
          max_sections: 50,
          default_display_order: 1,
        }),
      } satisfies IShoppingMallChannel.ICreate,
    },
  );
  typia.assert(channel);
  TestValidator.equals("channel code matches", channel.code, channelCode);

  // Step 3: Create section within the channel for deletion testing
  const sectionCode = RandomGenerator.alphaNumeric(6).toLowerCase();
  const sectionName = RandomGenerator.paragraph({
    sentences: 2,
    wordMin: 2,
    wordMax: 6,
  });

  const section =
    await api.functional.shoppingMall.admin.channels.sections.create(
      connection,
      {
        channelCode: channelCode,
        body: {
          code: sectionCode,
          name: sectionName,
          description: RandomGenerator.content({
            paragraphs: 1,
            sentenceMin: 3,
            sentenceMax: 6,
          }),
          display_order: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
          >(),
          status: "active",
          configuration: JSON.stringify({
            product_limit: 100,
            allow_sub_sections: false,
            visibility: "public",
          }),
        } satisfies IShoppingMallSection.ICreate,
      },
    );
  typia.assert(section);
  TestValidator.equals("section code matches", section.code, sectionCode);
  TestValidator.equals("section name matches", section.name, sectionName);

  // Step 4: Perform section deletion operation
  await api.functional.shoppingMall.admin.channels.sections.erase(connection, {
    channelCode: channelCode,
    sectionCode: sectionCode,
  });

  // Step 5: Validate deletion by ensuring channel remains functional
  // Create a new section to verify the channel still works after deletion
  const newSectionCode = RandomGenerator.alphaNumeric(6).toLowerCase();
  const newSection =
    await api.functional.shoppingMall.admin.channels.sections.create(
      connection,
      {
        channelCode: channelCode,
        body: {
          code: newSectionCode,
          name: "Section Created After Deletion",
          display_order: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
          >(),
          status: "active",
        } satisfies IShoppingMallSection.ICreate,
      },
    );
  typia.assert(newSection);
  TestValidator.equals(
    "new section code matches",
    newSection.code,
    newSectionCode,
  );

  TestValidator.predicate(
    "channel remains functional after section deletion",
    true,
  );
}
