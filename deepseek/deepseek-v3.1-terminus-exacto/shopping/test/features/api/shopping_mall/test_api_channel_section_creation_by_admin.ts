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
 * Test successful creation of a new shopping mall section within an existing
 * channel by an authenticated administrator. Validates that sections can be
 * properly organized within channels with unique codes, proper display
 * ordering, and appropriate status settings.
 */
export async function test_api_channel_section_creation_by_admin(
  connection: api.IConnection,
) {
  // 1. Create and authenticate as administrator
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
          can_create_channels: true,
          can_create_sections: true,
        }),
        status: "active",
      } satisfies IShoppingMallAdministrator.ICreate,
    });
  typia.assert(admin);

  // 2. Create parent channel
  const channelCode = RandomGenerator.alphaNumeric(8);
  const channelName = RandomGenerator.paragraph({ sentences: 3 });
  const channelDescription = RandomGenerator.content({ paragraphs: 1 });

  const channel: IShoppingMallChannel =
    await api.functional.shoppingMall.admin.channels.create(connection, {
      body: {
        code: channelCode,
        name: channelName,
        description: channelDescription,
        status: "active",
        configuration: JSON.stringify({
          allow_sections: true,
          max_sections: 50,
        }),
      } satisfies IShoppingMallChannel.ICreate,
    });
  typia.assert(channel);

  // 3. Create section within the channel
  const sectionCode = RandomGenerator.alphaNumeric(6);
  const sectionName = RandomGenerator.paragraph({ sentences: 2 });
  const sectionDescription = RandomGenerator.content({ paragraphs: 1 });
  const sectionDisplayOrder = typia.random<
    number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<1000>
  >();

  const section: IShoppingMallSection =
    await api.functional.shoppingMall.admin.channels.sections.create(
      connection,
      {
        channelCode: channel.code,
        body: {
          code: sectionCode,
          name: sectionName,
          description: sectionDescription,
          display_order: sectionDisplayOrder,
          status: "active",
          configuration: JSON.stringify({
            display_style: "grid",
            max_products: 100,
          }),
        } satisfies IShoppingMallSection.ICreate,
      },
    );
  typia.assert(section);

  // 4. Validate section properties match input values
  TestValidator.equals(
    "section code matches creation input",
    section.code,
    sectionCode,
  );
  TestValidator.equals(
    "section name matches creation input",
    section.name,
    sectionName,
  );
  TestValidator.equals(
    "section description matches creation input",
    section.description,
    sectionDescription,
  );
  TestValidator.equals(
    "section display order matches creation input",
    section.display_order,
    sectionDisplayOrder,
  );
  TestValidator.equals("section status is active", section.status, "active");
  TestValidator.predicate(
    "section has valid creation timestamp",
    section.created_at !== undefined,
  );
  TestValidator.predicate(
    "section has valid update timestamp",
    section.updated_at !== undefined,
  );
}
