import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSection";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallChannel";
import type { IShoppingMallSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSection";

export async function test_api_shopping_mall_channel_section_list_by_admin(
  connection: api.IConnection,
) {
  // 1. Admin user registration and login to authenticate
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const adminPassword = "1234";
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        name: typia.random<string>(),
        password: adminPassword,
        phone_number: null,
        role: "admin",
      } satisfies IShoppingMallAdmin.ICreate,
    });
  typia.assert(admin);

  // 2. Create a shopping mall channel
  const randomCode = RandomGenerator.paragraph({
    sentences: 1,
    wordMin: 3,
    wordMax: 3,
  })
    .replace(/\s/g, "-")
    .toLowerCase();
  const channelCreateBody = {
    code: randomCode,
    name: RandomGenerator.paragraph({ sentences: 2 }),
  } satisfies IShoppingMallChannel.ICreate;

  const channel: IShoppingMallChannel =
    await api.functional.shoppingMall.admin.shoppingMallChannels.create(
      connection,
      {
        body: channelCreateBody,
      },
    );
  typia.assert(channel);

  // 3. List shopping mall sections under created channel with filters
  // We use valid page and limit values, request only active sections
  // Also test search string with empty string to simulate no filter
  // Test ordering by name ascending

  const requestBody: IShoppingMallSection.IRequest = {
    page: 1,
    limit: 20,
    search: null,
    orderBy: "name",
    isActive: true,
  };

  const pageResult: IPageIShoppingMallSection.ISummary =
    await api.functional.shoppingMall.admin.shoppingMallChannels.shoppingMallSections.index(
      connection,
      {
        channelCode: channel.code,
        body: requestBody,
      },
    );
  typia.assert(pageResult);

  // 4. Validate pageResult pagination and data
  TestValidator.predicate(
    "pagination current page should be 1",
    pageResult.pagination.current === 1,
  );
  TestValidator.predicate(
    "pagination limit should be 20",
    pageResult.pagination.limit === 20,
  );
  TestValidator.predicate(
    "pagination records should be non-negative",
    pageResult.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages should be non-negative",
    pageResult.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "data should be an array",
    Array.isArray(pageResult.data),
  );

  // 5. Check each returned section conforms to summary
  for (const section of pageResult.data) {
    typia.assert(section);
    // Check required fields are non-empty strings
    TestValidator.predicate(
      "section id should be non-empty",
      typeof section.id === "string" && section.id.length > 0,
    );
    TestValidator.predicate(
      "section code should be non-empty",
      typeof section.code === "string" && section.code.length > 0,
    );
    TestValidator.predicate(
      "section name should be non-empty",
      typeof section.name === "string" && section.name.length > 0,
    );
  }
}
