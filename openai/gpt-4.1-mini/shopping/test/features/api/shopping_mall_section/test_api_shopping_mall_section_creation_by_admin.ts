import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallChannel";
import type { IShoppingMallSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSection";

export async function test_api_shopping_mall_section_creation_by_admin(
  connection: api.IConnection,
) {
  // 1. Admin user registration
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(12);
  const fixedAdminRole = RandomGenerator.pick(["superadmin", "admin"] as const);

  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        name: RandomGenerator.name(),
        password: adminPassword,
        phone_number: null,
        role: fixedAdminRole,
      } satisfies IShoppingMallAdmin.ICreate,
    });
  typia.assert(admin);

  // 2. Create a shopping mall channel
  const channelCode = RandomGenerator.alphaNumeric(10);
  const channelName = RandomGenerator.name();
  const channel: IShoppingMallChannel =
    await api.functional.shoppingMall.admin.shoppingMallChannels.create(
      connection,
      {
        body: {
          code: channelCode,
          name: channelName,
        } satisfies IShoppingMallChannel.ICreate,
      },
    );
  typia.assert(channel);
  TestValidator.equals("channel code matches", channel.code, channelCode);

  // 3. Create a shopping mall section under the created channel
  const sectionCode = RandomGenerator.alphaNumeric(8);
  const sectionName = RandomGenerator.name();
  const sectionDescription = RandomGenerator.paragraph({ sentences: 4 });

  const section: IShoppingMallSection =
    await api.functional.shoppingMall.admin.shoppingMallChannels.shoppingMallSections.create(
      connection,
      {
        channelCode: channelCode,
        body: {
          code: sectionCode,
          name: sectionName,
          description: sectionDescription,
        } satisfies IShoppingMallSection.ICreate,
      },
    );

  typia.assert(section);
  TestValidator.equals(
    "section channelCode matches",
    section.channelCode,
    channelCode,
  );
  TestValidator.equals("section code matches", section.code, sectionCode);
  TestValidator.equals("section name matches", section.name, sectionName);
  TestValidator.equals(
    "section description matches",
    section.description ?? null,
    sectionDescription,
  );
  TestValidator.predicate("section is active", section.isActive);
  TestValidator.predicate("section order is non negative", section.order >= 0);
  TestValidator.predicate(
    "section createdAt is ISO date-time",
    /^[0-9]{4}-[0-9]{2}-[0-9]{2}T/.test(section.createdAt),
  );
  TestValidator.equals(
    "section updatedAt is null",
    section.updatedAt ?? null,
    null,
  );
  TestValidator.equals(
    "section deletedAt is null",
    section.deletedAt ?? null,
    null,
  );
}
