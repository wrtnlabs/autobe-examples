import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformModerationLog } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationLog";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformModerationLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformModerationLog";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_moderation_logs_filter_by_date_range_and_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin join and authorization
  const adminJoinConnection: api.IConnection = { host: connection.host };
  const adminAuthorized = await authorize_admin_join(adminJoinConnection, {
    body: {
      email: `admin_${RandomGenerator.alphaNumeric(8)}@test.com`,
      password: "strongPassword123!",
      displayName: RandomGenerator.name(),
      bio: null,
      avatarUrl: null,
    },
  });
  adminJoinConnection.headers ??= {};
  adminJoinConnection.headers.Authorization = adminAuthorized.token.access;
  // 2. Prepare a time window for filtering
  // We'll get moderation logs filtered by createdAt
  // For robust testing, simulate creation time filter range covering up to now
  const now = new Date();
  const oneDayMs = 24 * 60 * 60 * 1000;
  // Define filter window: from 10 days ago to now
  const createdAtFrom = new Date(
    now.getTime() - 10 * oneDayMs,
  ).toISOString() satisfies string & tags.Format<"date-time">;
  const createdAtTo = now.toISOString() satisfies string &
    tags.Format<"date-time">;
  // 3. Test unauthorized request (should fail)
  await TestValidator.httpError("unauthorized access", 401, async () => {
    const fakeConnection: api.IConnection = { host: connection.host };
    await api.functional.communityPlatform.admin.moderation_logs.index(
      fakeConnection,
      {
        body: {
          createdAtFrom,
          createdAtTo,
          page: 1,
          limit: 5,
          sortBy: "created_at",
        },
      },
    );
  });
  // 4. Make authorized request with pagination and date filter
  const limit = 5;
  // Helper to fetch one page
  async function fetchPage(
    page: number,
  ): Promise<
    import("@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformModerationLog").IPageICommunityPlatformModerationLog.ISummary
  > {
    const response =
      await api.functional.communityPlatform.admin.moderation_logs.index(
        adminJoinConnection,
        {
          body: {
            createdAtFrom,
            createdAtTo,
            page,
            limit,
            sortBy: "created_at",
          },
        },
      );
    typia.assert(response);
    return response;
  }
  // Fetch first page
  const firstPage = await fetchPage(1);
  // Validate pagination info
  TestValidator.predicate(
    "pagination current page is 1",
    firstPage.pagination.current === 1,
  );
  TestValidator.predicate(
    "pagination limit matches",
    firstPage.pagination.limit === limit,
  );
  TestValidator.predicate(
    "records count is less or equal to limit",
    firstPage.data.length <= limit,
  );
  TestValidator.predicate(
    "all createdAt values in range from createdAtFrom to createdAtTo",
    () =>
      firstPage.data.every((log) => {
        const createdAtTime = new Date(log.createdAt).getTime();
        return (
          createdAtTime >= new Date(createdAtFrom).getTime() &&
          createdAtTime <= new Date(createdAtTo).getTime()
        );
      }),
  );
  // If no data, skip further pagination
  if (firstPage.pagination.pages <= 1) return;
  // Fetch last page
  const lastPageNumber = firstPage.pagination.pages;
  const lastPage = await fetchPage(lastPageNumber);
  TestValidator.predicate(
    "pagination current page is last page",
    lastPage.pagination.current === lastPageNumber,
  );
  TestValidator.predicate(
    "pagination limit matches on last page",
    lastPage.pagination.limit === limit,
  );
  TestValidator.predicate(
    "all createdAt values in last page within range",
    () =>
      lastPage.data.every((log) => {
        const createdAtTime = new Date(log.createdAt).getTime();
        return (
          createdAtTime >= new Date(createdAtFrom).getTime() &&
          createdAtTime <= new Date(createdAtTo).getTime()
        );
      }),
  );
  // Optional: Check continuity between first and last pages (records order)
  // Additional: Test no logs outside createdAt filter:
  // fetch with a very narrow range expecting zero or small results
  const narrowFrom = new Date(
    now.getTime() - 1000,
  ).toISOString() satisfies string & tags.Format<"date-time">;
  const narrowTo = now.toISOString() satisfies string &
    tags.Format<"date-time">;
  const narrowPage =
    await api.functional.communityPlatform.admin.moderation_logs.index(
      adminJoinConnection,
      {
        body: {
          createdAtFrom: narrowFrom,
          createdAtTo: narrowTo,
          page: 1,
          limit: 10,
          sortBy: "created_at",
        },
      },
    );
  typia.assert(narrowPage);
  TestValidator.predicate(
    "narrow date range returns logs only in the narrow date range",
    narrowPage.data.every((log) => {
      const createdAtTime = new Date(log.createdAt).getTime();
      return (
        createdAtTime >= new Date(narrowFrom).getTime() &&
        createdAtTime <= new Date(narrowTo).getTime()
      );
    }),
  );
  // 5. Assert that createdAt of all fetched records are within the filter range
  const allPagesData = [...firstPage.data, ...lastPage.data];
  TestValidator.predicate(
    "all fetched data createdAt within filter range",
    () =>
      allPagesData.every((log) => {
        const createdAtTime = new Date(log.createdAt).getTime();
        return (
          createdAtTime >= new Date(createdAtFrom).getTime() &&
          createdAtTime <= new Date(createdAtTo).getTime()
        );
      }),
  );
}
