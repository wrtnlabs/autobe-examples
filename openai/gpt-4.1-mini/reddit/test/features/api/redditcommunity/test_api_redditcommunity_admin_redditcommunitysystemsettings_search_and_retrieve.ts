import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunitySystemSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunitySystemSetting";
import type { IRedditCommunityAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityAdmin";
import type { IRedditCommunityAdminSettings } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityAdminSettings";
import type { IRedditCommunitySystemSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunitySystemSetting";

/**
 * This test function validates the PATCH
 * /redditCommunity/admin/redditCommunitySystemSettings API endpoint for admin
 * users.
 *
 * It tests:
 *
 * 1. Admin user account creation and authentication on /auth/admin/join.
 * 2. Authorized access to the system settings search endpoint with pagination,
 *    filtering, and sorting.
 * 3. Response shape validation using typia.assert.
 * 4. Pagination correctness and filtering correctness through different page and
 *    limit settings.
 * 5. Sorting order verification by name or updated_at fields in ascending and
 *    descending order.
 * 6. Unauthorized access rejection with appropriate error catching.
 *
 * The test uses realistic randomized values for search queries and sort orders.
 */
export async function test_api_redditcommunity_admin_redditcommunitysystemsettings_search_and_retrieve(
  connection: api.IConnection,
) {
  // 1. Admin user join and authenticate
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "Pa$w0rd123";
  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
    } satisfies IRedditCommunityAdmin.ICreate,
  });
  typia.assert(admin);
  TestValidator.predicate("admin token exists", admin.token.access.length > 0);

  // Base search request for reuse
  const searchRequestBase = {
    page: 1,
    limit: 10,
  } satisfies IRedditCommunitySystemSetting.IRequest;

  // 2. Authorized search without filters
  let response =
    await api.functional.redditCommunity.admin.redditCommunitySystemSettings.index(
      connection,
      { body: searchRequestBase },
    );
  typia.assert(response);
  TestValidator.predicate(
    "response data array exists",
    Array.isArray(response.data) &&
      response.data.length <= searchRequestBase.limit,
  );

  // 3. Search with random query and verify filtering
  const randomSearch = RandomGenerator.paragraph({
    sentences: 1,
    wordMin: 3,
    wordMax: 8,
  });
  response =
    await api.functional.redditCommunity.admin.redditCommunitySystemSettings.index(
      connection,
      {
        body: {
          page: 1,
          limit: 20,
          search: randomSearch,
        },
      },
    );
  typia.assert(response);
  TestValidator.predicate(
    `filtered results contain entries matching search '${randomSearch}'`,
    response.data.every(
      (entry) =>
        entry.name.includes(randomSearch) || entry.value.includes(randomSearch),
    ),
  );

  // 4. Test pagination: fetch page 2 and verify no overlap with page 1
  const page1 = response;
  const page2 =
    await api.functional.redditCommunity.admin.redditCommunitySystemSettings.index(
      connection,
      {
        body: {
          page: 2,
          limit: 20,
          search: randomSearch,
        },
      },
    );
  typia.assert(page2);
  const page1Ids = new Set(page1.data.map((x) => x.id));
  TestValidator.predicate(
    "page 2 data does not overlap with page 1 data",
    page2.data.every((x) => !page1Ids.has(x.id)),
  );

  // 5. Sorting validations
  // Ascending by name
  const sortedAsc =
    await api.functional.redditCommunity.admin.redditCommunitySystemSettings.index(
      connection,
      {
        body: { page: 1, limit: 30, sort_by: "name", order: "asc" },
      },
    );
  typia.assert(sortedAsc);

  for (let i = 1; i < sortedAsc.data.length; i++) {
    TestValidator.predicate(
      `validate ascending name sort at index ${i}`,
      sortedAsc.data[i - 1].name <= sortedAsc.data[i].name,
    );
  }

  // Descending by name
  const sortedDesc =
    await api.functional.redditCommunity.admin.redditCommunitySystemSettings.index(
      connection,
      {
        body: { page: 1, limit: 30, sort_by: "name", order: "desc" },
      },
    );
  typia.assert(sortedDesc);

  for (let i = 1; i < sortedDesc.data.length; i++) {
    TestValidator.predicate(
      `validate descending name sort at index ${i}`,
      sortedDesc.data[i - 1].name >= sortedDesc.data[i].name,
    );
  }

  // Ascending by updated_at
  const updatedAsc =
    await api.functional.redditCommunity.admin.redditCommunitySystemSettings.index(
      connection,
      {
        body: { page: 1, limit: 25, sort_by: "updated_at", order: "asc" },
      },
    );
  typia.assert(updatedAsc);

  for (let i = 1; i < updatedAsc.data.length; i++) {
    TestValidator.predicate(
      `validate ascending updated_at sort at index ${i}`,
      updatedAsc.data[i - 1].updated_at <= updatedAsc.data[i].updated_at,
    );
  }

  // Descending by updated_at
  const updatedDesc =
    await api.functional.redditCommunity.admin.redditCommunitySystemSettings.index(
      connection,
      {
        body: { page: 1, limit: 25, sort_by: "updated_at", order: "desc" },
      },
    );
  typia.assert(updatedDesc);

  for (let i = 1; i < updatedDesc.data.length; i++) {
    TestValidator.predicate(
      `validate descending updated_at sort at index ${i}`,
      updatedDesc.data[i - 1].updated_at >= updatedDesc.data[i].updated_at,
    );
  }

  // 6. Unauthorized access test
  const unauthenticatedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };
  await TestValidator.error(
    "unauthorized access should be denied",
    async () => {
      await api.functional.redditCommunity.admin.redditCommunitySystemSettings.index(
        unauthenticatedConnection,
        { body: searchRequestBase },
      );
    },
  );
}
