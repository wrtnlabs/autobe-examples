import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallChannel";
import type { IShoppingMallSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSection";

export async function test_api_shopping_mall_section_update_by_admin(
  connection: api.IConnection,
) {
  // 1. Admin user registers and authenticates
  const adminCreate: IShoppingMallAdmin.ICreate = {
    email: typia.random<string & tags.Format<"email">>(),
    name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(12),
    phone_number: null,
    role: "admin",
  };

  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, { body: adminCreate });
  typia.assert(admin);
  TestValidator.predicate(
    "admin token should be set in connection headers",
    connection.headers?.Authorization === admin.token.access,
  );

  // 2. Admin creates a shopping mall channel
  const channelCreate: IShoppingMallChannel.ICreate = {
    code: RandomGenerator.alphaNumeric(8),
    name: RandomGenerator.name(2),
  };

  const channel: IShoppingMallChannel =
    await api.functional.shoppingMall.admin.shoppingMallChannels.create(
      connection,
      { body: channelCreate },
    );
  typia.assert(channel);
  TestValidator.equals(
    "channel code matches",
    channel.code,
    channelCreate.code,
  );
  TestValidator.equals(
    "channel name matches",
    channel.name,
    channelCreate.name,
  );

  // 3. Admin creates a new section in the created channel
  const sectionCode = RandomGenerator.alphaNumeric(6);
  const sectionCreate: IShoppingMallSection.ICreate = {
    code: sectionCode,
    name: RandomGenerator.name(2),
    description: RandomGenerator.paragraph({ sentences: 5 }),
  };

  const section: IShoppingMallSection =
    await api.functional.shoppingMall.admin.shoppingMallChannels.shoppingMallSections.create(
      connection,
      {
        channelCode: channel.code,
        body: sectionCreate,
      },
    );
  typia.assert(section);
  TestValidator.equals(
    "section code matches",
    section.code,
    sectionCreate.code,
  );
  TestValidator.equals(
    "section name matches",
    section.name,
    sectionCreate.name,
  );
  TestValidator.equals(
    "section description matches",
    section.description,
    sectionCreate.description,
  );
  TestValidator.predicate(
    "section is active by default",
    section.isActive === true,
  );

  // 4. Admin updates the section details
  const sectionUpdate: IShoppingMallSection.IUpdate = {
    name: RandomGenerator.name(3),
    description: RandomGenerator.paragraph({ sentences: 7 }),
    order: typia.random<number & tags.Type<"int32"> & tags.Minimum<0>>(),
  };

  const updatedSection: IShoppingMallSection =
    await api.functional.shoppingMall.admin.shoppingMallChannels.shoppingMallSections.update(
      connection,
      {
        channelCode: channel.code,
        sectionCode: section.code,
        body: sectionUpdate,
      },
    );
  typia.assert(updatedSection);
  TestValidator.equals(
    "updated section name matches",
    updatedSection.name,
    sectionUpdate.name,
  );
  TestValidator.equals(
    "updated section description matches",
    updatedSection.description,
    sectionUpdate.description,
  );
  TestValidator.equals(
    "updated section order matches",
    updatedSection.order,
    sectionUpdate.order,
  );
}
