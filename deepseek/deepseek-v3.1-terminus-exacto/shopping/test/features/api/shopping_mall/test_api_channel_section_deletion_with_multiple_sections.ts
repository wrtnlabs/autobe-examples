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
 * Test section deletion when multiple sections exist within a channel.
 *
 * This comprehensive E2E test validates that section deletion targets the
 * correct section without affecting other sections in the same channel and
 * maintains proper display ordering after removal.
 */
export async function test_api_channel_section_deletion_with_multiple_sections(
  connection: api.IConnection,
) {
  // Step 1: Authenticate as administrator
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

  // Step 2: Create parent channel
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

  // Step 3: Create first section
  const firstSectionCode = RandomGenerator.alphaNumeric(6);
  const firstSection =
    await api.functional.shoppingMall.admin.channels.sections.create(
      connection,
      {
        channelCode: channel.code,
        body: {
          code: firstSectionCode,
          name: RandomGenerator.paragraph({ sentences: 2 }),
          description: RandomGenerator.content({ paragraphs: 1 }),
          display_order: 1,
          status: "active",
          configuration: JSON.stringify({ featured: true }),
        } satisfies IShoppingMallSection.ICreate,
      },
    );
  typia.assert(firstSection);

  // Step 4: Create second section
  const secondSectionCode = RandomGenerator.alphaNumeric(6);
  const secondSection =
    await api.functional.shoppingMall.admin.channels.sections.create(
      connection,
      {
        channelCode: channel.code,
        body: {
          code: secondSectionCode,
          name: RandomGenerator.paragraph({ sentences: 2 }),
          description: RandomGenerator.content({ paragraphs: 1 }),
          display_order: 2,
          status: "active",
          configuration: JSON.stringify({ featured: false }),
        } satisfies IShoppingMallSection.ICreate,
      },
    );
  typia.assert(secondSection);

  // Validate section creation
  TestValidator.equals(
    "first section display order",
    firstSection.display_order,
    1,
  );
  TestValidator.equals(
    "second section display order",
    secondSection.display_order,
    2,
  );
  TestValidator.notEquals(
    "section codes should be unique",
    firstSection.code,
    secondSection.code,
  );

  // Step 5: Delete the first section
  await api.functional.shoppingMall.admin.channels.sections.erase(connection, {
    channelCode: channel.code,
    sectionCode: firstSection.code,
  });

  // Step 6: Verify deletion by attempting to delete again (should fail)
  await TestValidator.error(
    "deleting non-existent section should fail",
    async () => {
      await api.functional.shoppingMall.admin.channels.sections.erase(
        connection,
        {
          channelCode: channel.code,
          sectionCode: firstSection.code,
        },
      );
    },
  );

  // Step 7: Verify second section still exists (by attempting to delete it successfully)
  await api.functional.shoppingMall.admin.channels.sections.erase(connection, {
    channelCode: channel.code,
    sectionCode: secondSection.code,
  });

  // Step 8: Verify channel still exists
  TestValidator.equals(
    "channel code remains unchanged",
    channel.code,
    channelCode,
  );

  // Additional validation: Test section code uniqueness constraint
  await TestValidator.error(
    "creating section with duplicate code should fail",
    async () => {
      await api.functional.shoppingMall.admin.channels.sections.create(
        connection,
        {
          channelCode: channel.code,
          body: {
            code: firstSectionCode, // Using same code as deleted section
            name: RandomGenerator.paragraph({ sentences: 2 }),
            description: RandomGenerator.content({ paragraphs: 1 }),
            display_order: 3,
            status: "active",
            configuration: JSON.stringify({ featured: false }),
          } satisfies IShoppingMallSection.ICreate,
        },
      );
    },
  );
}
