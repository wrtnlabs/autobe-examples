import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardSystemSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSystemSetting";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardSystemSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardSystemSetting";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_system_settings_search_filtering(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  typia.assert(adminAuth);
  // 2. Test 1: Search by key field (partial match)
  const searchByKey =
    await api.functional.discussionBoard.admin.system.settings.index(
      adminConnection,
      {
        body: {
          search: "site",
          page: 1,
          limit: 20,
        } satisfies IDiscussionBoardSystemSetting.IRequest,
      },
    );
  typia.assert(searchByKey);
  TestValidator.predicate(
    "search by key returns matching results",
    searchByKey.data.every(
      (setting) =>
        setting.key.toLowerCase().includes("site".toLowerCase()) ||
        setting.value.toLowerCase().includes("site".toLowerCase()) ||
        (setting.description !== null &&
          setting.description.toLowerCase().includes("site".toLowerCase())),
    ),
  );
  // 3. Test 2: Search by value field (partial match)
  const searchByValue =
    await api.functional.discussionBoard.admin.system.settings.index(
      adminConnection,
      {
        body: {
          search: "true",
          page: 1,
          limit: 20,
        } satisfies IDiscussionBoardSystemSetting.IRequest,
      },
    );
  typia.assert(searchByValue);
  TestValidator.predicate(
    "search by value returns matching results",
    searchByValue.data.every(
      (setting) =>
        setting.key.toLowerCase().includes("true".toLowerCase()) ||
        setting.value.toLowerCase().includes("true".toLowerCase()) ||
        (setting.description !== null &&
          setting.description.toLowerCase().includes("true".toLowerCase())),
    ),
  );
  // 4. Test 3: Search by description field (partial match)
  const searchByDescription =
    await api.functional.discussionBoard.admin.system.settings.index(
      adminConnection,
      {
        body: {
          search: "setting",
          page: 1,
          limit: 20,
        } satisfies IDiscussionBoardSystemSetting.IRequest,
      },
    );
  typia.assert(searchByDescription);
  TestValidator.predicate(
    "search by description returns matching results",
    searchByDescription.data.every(
      (setting) =>
        setting.key.toLowerCase().includes("setting".toLowerCase()) ||
        setting.value.toLowerCase().includes("setting".toLowerCase()) ||
        (setting.description !== null &&
          setting.description.toLowerCase().includes("setting".toLowerCase())),
    ),
  );
  // 5. Test 4: Exact key filter
  const exactKeyFilter =
    await api.functional.discussionBoard.admin.system.settings.index(
      adminConnection,
      {
        body: {
          key: "site.name",
          page: 1,
          limit: 20,
        } satisfies IDiscussionBoardSystemSetting.IRequest,
      },
    );
  typia.assert(exactKeyFilter);
  TestValidator.predicate(
    "exact key filter returns only matching keys",
    exactKeyFilter.data.every((setting) => setting.key === "site.name"),
  );
  // 6. Test 5: Combined search and key filter
  const combinedFilter =
    await api.functional.discussionBoard.admin.system.settings.index(
      adminConnection,
      {
        body: {
          search: "site",
          key: "site.name",
          page: 1,
          limit: 20,
        } satisfies IDiscussionBoardSystemSetting.IRequest,
      },
    );
  typia.assert(combinedFilter);
  TestValidator.predicate(
    "combined filter returns only matching results",
    combinedFilter.data.every(
      (setting) =>
        setting.key === "site.name" &&
        (setting.key.toLowerCase().includes("site".toLowerCase()) ||
          setting.value.toLowerCase().includes("site".toLowerCase()) ||
          (setting.description !== null &&
            setting.description.toLowerCase().includes("site".toLowerCase()))),
    ),
  );
  // 7. Test 6: Empty search returns proper pagination metadata
  const emptySearch =
    await api.functional.discussionBoard.admin.system.settings.index(
      adminConnection,
      {
        body: {
          search: "nonexistent_setting_xyz123",
          page: 1,
          limit: 20,
        } satisfies IDiscussionBoardSystemSetting.IRequest,
      },
    );
  typia.assert(emptySearch);
  TestValidator.equals(
    "empty search returns records=0",
    emptySearch.pagination.records,
    0,
  );
  TestValidator.equals(
    "empty search returns pages=0",
    emptySearch.pagination.pages,
    0,
  );
  TestValidator.equals(
    "empty search returns empty data array",
    emptySearch.data.length,
    0,
  );
  // 8. Test 7: Case-insensitive search
  const caseInsensitiveSearch =
    await api.functional.discussionBoard.admin.system.settings.index(
      adminConnection,
      {
        body: {
          search: "SITE",
          page: 1,
          limit: 20,
        } satisfies IDiscussionBoardSystemSetting.IRequest,
      },
    );
  typia.assert(caseInsensitiveSearch);
  TestValidator.equals(
    "case-insensitive search returns same count as lowercase",
    caseInsensitiveSearch.pagination.records,
    searchByKey.pagination.records,
  );
  // 9. Test 8: Pagination works correctly
  const paginatedSearch =
    await api.functional.discussionBoard.admin.system.settings.index(
      adminConnection,
      {
        body: {
          search: "site",
          page: 1,
          limit: 5,
        } satisfies IDiscussionBoardSystemSetting.IRequest,
      },
    );
  typia.assert(paginatedSearch);
  TestValidator.equals(
    "limit is respected in pagination metadata",
    paginatedSearch.pagination.limit,
    5,
  );
  TestValidator.equals(
    "page is 1-indexed in pagination metadata",
    paginatedSearch.pagination.current,
    1,
  );
  TestValidator.predicate(
    "data array length does not exceed limit",
    paginatedSearch.data.length <= 5,
  );
  TestValidator.predicate(
    "data array length matches pagination records when on first page",
    paginatedSearch.data.length ===
      Math.min(
        paginatedSearch.pagination.records,
        paginatedSearch.pagination.limit,
      ),
  );
}
