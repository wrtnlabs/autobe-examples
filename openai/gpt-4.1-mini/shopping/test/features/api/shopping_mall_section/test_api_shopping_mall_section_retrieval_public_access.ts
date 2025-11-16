import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallChannel";
import type { IShoppingMallSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSection";

export async function test_api_shopping_mall_section_retrieval_public_access(
  connection: api.IConnection,
) {
  // 1. Admin user join to get authorization
  const adminEmail = `${RandomGenerator.alphaNumeric(8)}@example.com`;
  const adminJoinBody = {
    email: adminEmail,
    name: RandomGenerator.name(2),
    password: "TestPassword123!",
    phone_number: null,
    role: "admin",
  } satisfies IShoppingMallAdmin.ICreate;

  const adminAuthorized = await api.functional.auth.admin.join(connection, {
    body: adminJoinBody,
  });
  typia.assert(adminAuthorized);

  // 2. Create shopping mall channel
  const channelCode = `channel_${RandomGenerator.alphaNumeric(6)}`;
  const channelName = RandomGenerator.name(2);
  const channelCreateBody = {
    code: channelCode,
    name: channelName,
  } satisfies IShoppingMallChannel.ICreate;

  const channel =
    await api.functional.shoppingMall.admin.shoppingMallChannels.create(
      connection,
      {
        body: channelCreateBody,
      },
    );
  typia.assert(channel);

  // 3. Create shopping mall section in channel
  const sectionCode = `section_${RandomGenerator.alphaNumeric(6)}`;
  const sectionName = RandomGenerator.name(2);
  const sectionDescription = RandomGenerator.paragraph({
    sentences: 3,
    wordMin: 5,
    wordMax: 8,
  });
  const sectionCreateBody = {
    code: sectionCode,
    name: sectionName,
    description: sectionDescription,
  } satisfies IShoppingMallSection.ICreate;

  const section =
    await api.functional.shoppingMall.admin.shoppingMallChannels.shoppingMallSections.create(
      connection,
      {
        channelCode: channelCode,
        body: sectionCreateBody,
      },
    );
  typia.assert(section);

  // 4. Retrieve section publicly without authentication
  // Create an unauthenticated connection (no headers)
  const unauthConnection: api.IConnection = { ...connection, headers: {} };

  const retrievedSection =
    await api.functional.shoppingMall.shoppingMallChannels.shoppingMallSections.at(
      unauthConnection,
      {
        channelCode: channelCode,
        sectionCode: sectionCode,
      },
    );
  typia.assert(retrievedSection);

  // 5. Validate the retrieved section matches the created one
  TestValidator.equals(
    "channel code matches",
    retrievedSection.channelCode,
    channelCode,
  );
  TestValidator.equals(
    "section code matches",
    retrievedSection.code,
    sectionCode,
  );
  TestValidator.equals(
    "section name matches",
    retrievedSection.name,
    sectionName,
  );
  TestValidator.equals(
    "section description matches",
    retrievedSection.description,
    sectionDescription,
  );
  TestValidator.predicate(
    "section is active",
    retrievedSection.isActive === true,
  );
}
