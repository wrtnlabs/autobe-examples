import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformModerationLog } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationLog";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformModerationLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformModerationLog";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_moderation_logs_pagination(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Authenticate as admin user
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      href: "https://example.com/join",
      referrer: "https://example.com",
      ip: null,
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  // Step 2: Retrieve moderation logs with default parameters to get initial data
  const initialResponse =
    await api.functional.communityPlatform.admin.moderation.logs.index(
      adminConnection,
      {
        body: {
          page: 1,
          limit: 25,
        } satisfies ICommunityPlatformModerationLog.IRequest,
      },
    );
  typia.assert(initialResponse);
  // If no logs are found, we can't test pagination properly, so we need to handle this case
  // According to the API spec, it should still return correct pagination metadata
  TestValidator.equals(
    "initial response should have pagination metadata",
    initialResponse.pagination.current !== undefined,
    true,
  );
  TestValidator.equals(
    "initial response should have a limit",
    initialResponse.pagination.limit !== undefined,
    true,
  );
  TestValidator.equals(
    "initial response should have records count",
    initialResponse.pagination.records !== undefined,
    true,
  );
  TestValidator.equals(
    "initial response should have pages count",
    initialResponse.pagination.pages !== undefined,
    true,
  );
  // Step 3: Test boundary condition with limit=1 (page 1)
  const page1Limit1 =
    await api.functional.communityPlatform.admin.moderation.logs.index(
      adminConnection,
      {
        body: {
          page: 1,
          limit: 1,
        } satisfies ICommunityPlatformModerationLog.IRequest,
      },
    );
  typia.assert(page1Limit1);
  TestValidator.equals(
    "page 1 limit 1 should return at most 1 record",
    page1Limit1.data.length <= 1,
    true,
  );
  TestValidator.equals(
    "page 1 limit 1 pagination should show current page 1",
    page1Limit1.pagination.current,
    1,
  );
  TestValidator.equals(
    "page 1 limit 1 pagination should show limit 1",
    page1Limit1.pagination.limit,
    1,
  );
  TestValidator.equals(
    "page 1 limit 1 pagination should show correct total records",
    page1Limit1.pagination.records,
    initialResponse.pagination.records,
  );
  // Step 4: Test pagination with limit=25
  const page1Limit25 =
    await api.functional.communityPlatform.admin.moderation.logs.index(
      adminConnection,
      {
        body: {
          page: 1,
          limit: 25,
        } satisfies ICommunityPlatformModerationLog.IRequest,
      },
    );
  typia.assert(page1Limit25);
  TestValidator.equals(
    "page 1 limit 25 should return valid number of records",
    page1Limit25.data.length >= 0,
    true,
  );
  TestValidator.equals(
    "page 1 limit 25 pagination should show current page 1",
    page1Limit25.pagination.current,
    1,
  );
  TestValidator.equals(
    "page 1 limit 25 pagination should show limit 25",
    page1Limit25.pagination.limit,
    25,
  );
  TestValidator.equals(
    "page 1 limit 25 pagination should show correct total records",
    page1Limit25.pagination.records,
    initialResponse.pagination.records,
  );
  // Step 5: Test pagination with limit=100
  const page1Limit100 =
    await api.functional.communityPlatform.admin.moderation.logs.index(
      adminConnection,
      {
        body: {
          page: 1,
          limit: 100,
        } satisfies ICommunityPlatformModerationLog.IRequest,
      },
    );
  typia.assert(page1Limit100);
  TestValidator.equals(
    "page 1 limit 100 should return valid number of records",
    page1Limit100.data.length >= 0,
    true,
  );
  TestValidator.equals(
    "page 1 limit 100 pagination should show current page 1",
    page1Limit100.pagination.current,
    1,
  );
  TestValidator.equals(
    "page 1 limit 100 pagination should show limit 100",
    page1Limit100.pagination.limit,
    100,
  );
  TestValidator.equals(
    "page 1 limit 100 pagination should show correct total records",
    page1Limit100.pagination.records,
    initialResponse.pagination.records,
  );
  // Step 6: Test that subsequent pages are distinct
  // Only proceed if we have more than 25 records
  if (initialResponse.pagination.records > 25) {
    const page2Limit25 =
      await api.functional.communityPlatform.admin.moderation.logs.index(
        adminConnection,
        {
          body: {
            page: 2,
            limit: 25,
          } satisfies ICommunityPlatformModerationLog.IRequest,
        },
      );
    typia.assert(page2Limit25);
    TestValidator.equals(
      "page 2 limit 25 should return valid number of records",
      page2Limit25.data.length >= 0,
      true,
    );
    // Verify pages have no overlap in IDs
    const page1Ids = new Set(page1Limit25.data.map((log) => log.id));
    const page2Ids = new Set(page2Limit25.data.map((log) => log.id));
    const overlap = Array.from(page1Ids).filter((id) => page2Ids.has(id));
    TestValidator.equals(
      "page 1 and page 2 should have no overlapping records",
      overlap.length,
      0,
    );
    // Validate pagination metadata for page 2
    TestValidator.equals(
      "page 2 pagination should show current page 2",
      page2Limit25.pagination.current,
      2,
    );
    TestValidator.equals(
      "page 2 pagination should show limit 25",
      page2Limit25.pagination.limit,
      25,
    );
    TestValidator.equals(
      "page 2 pagination should show correct total records",
      page2Limit25.pagination.records,
      initialResponse.pagination.records,
    );
    TestValidator.equals(
      "page 2 pagination should show correct total pages",
      page2Limit25.pagination.pages,
      initialResponse.pagination.pages,
    );
  }
  // Step 7: Test beyond available pages
  // Calculate maximum page based on records and limit
  const maxPage = Math.ceil(initialResponse.pagination.records / 25);
  const beyondPage = maxPage + 1;
  if (beyondPage > 1) {
    // Only test if there is a beyond page
    const beyondPageResponse =
      await api.functional.communityPlatform.admin.moderation.logs.index(
        adminConnection,
        {
          body: {
            page: beyondPage,
            limit: 25,
          } satisfies ICommunityPlatformModerationLog.IRequest,
        },
      );
    typia.assert(beyondPageResponse);
    TestValidator.equals(
      "beyond page should return empty data array",
      beyondPageResponse.data.length,
      0,
    );
    TestValidator.equals(
      "beyond page pagination should show correct current page",
      beyondPageResponse.pagination.current,
      beyondPage,
    );
    TestValidator.equals(
      "beyond page pagination should show correct limit",
      beyondPageResponse.pagination.limit,
      25,
    );
    TestValidator.equals(
      "beyond page pagination should show correct total records",
      beyondPageResponse.pagination.records,
      initialResponse.pagination.records,
    );
    TestValidator.equals(
      "beyond page pagination should show correct total pages",
      beyondPageResponse.pagination.pages,
      maxPage,
    );
  }
  // Step 8: Validate sorting is by timestamp descending (most recent first)
  if (initialResponse.data.length > 1 && initialResponse.data.length >= 2) {
    // Check that the first record is the most recent
    for (let i = 0; i < initialResponse.data.length - 1; i++) {
      const currentTimestamp = new Date(initialResponse.data[i].created_at);
      const nextTimestamp = new Date(initialResponse.data[i + 1].created_at);
      TestValidator.predicate(
        `log at index ${i} should be >= log at index ${i + 1}`,
        () => currentTimestamp.getTime() >= nextTimestamp.getTime(),
      );
    }
  }
}
