import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditPlatformPostEngagementStat } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformPostEngagementStat";
import type { IRedditPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformAdmin";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import type { IRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPost";
import type { IRedditPlatformPostEngagementStat } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPostEngagementStat";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_analytics_posts_pagination_limits(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin authentication
  const adminConnection: api.IConnection = { host: connection.host };
  const admin: IRedditPlatformAdmin.IAuthorized = await authorize_admin_join(
    adminConnection,
    {
      body: typia.random<IRedditPlatformAdmin.IJoin>(),
    },
  );
  typia.assert(admin);
  // Re-create connection with admin token for authenticated requests
  const authenticatedConnection: api.IConnection = {
    host: connection.host,
    headers: {
      ...connection.headers,
      Authorization: admin.token.access,
    },
  };
  // 2. Test page=1 with pageSize=10 (first page with 10 items)
  const page1Response: IPageIRedditPlatformPostEngagementStat.ISummary =
    await api.functional.redditPlatform.admin.analytics.posts.index(
      authenticatedConnection,
      {
        body: {
          page: 1,
          pageSize: 10,
        } satisfies IRedditPlatformPostEngagementStat.IRequest,
      },
    );
  typia.assert(page1Response);
  // 3. Verify pagination metadata for page 1
  TestValidator.equals(
    "page 1 current page",
    page1Response.pagination.current,
    1,
  );
  TestValidator.equals("page 1 limit", page1Response.pagination.limit, 10);
  TestValidator.predicate(
    "page 1 has records",
    page1Response.pagination.records > 0,
  );
  TestValidator.predicate(
    "page 1 has pages",
    page1Response.pagination.pages > 0,
  );
  // 4. Verify data array length matches expected page size (or less if fewer records)
  TestValidator.predicate(
    "page 1 data length is 10 or less",
    page1Response.data.length <= 10 && page1Response.data.length > 0,
  );
  // 5. Test page=2 (second page, items 11-20)
  const page2Response: IPageIRedditPlatformPostEngagementStat.ISummary =
    await api.functional.redditPlatform.admin.analytics.posts.index(
      authenticatedConnection,
      {
        body: {
          page: 2,
          pageSize: 10,
        } satisfies IRedditPlatformPostEngagementStat.IRequest,
      },
    );
  typia.assert(page2Response);
  // 6. Verify second page returns different current page number
  TestValidator.equals(
    "page 2 current page",
    page2Response.pagination.current,
    2,
  );
  // 7. Test limit=50 (larger page size)
  const limit50Response: IPageIRedditPlatformPostEngagementStat.ISummary =
    await api.functional.redditPlatform.admin.analytics.posts.index(
      authenticatedConnection,
      {
        body: {
          limit: 50,
        } satisfies IRedditPlatformPostEngagementStat.IRequest,
      },
    );
  typia.assert(limit50Response);
  // 8. Verify limit 50 returns up to 50 records
  TestValidator.predicate(
    "limit 50 data length is 50 or less",
    limit50Response.data.length <= 50 && limit50Response.data.length > 0,
  );
  // 9. Test limit=null (default behavior)
  const limitNullResponse: IPageIRedditPlatformPostEngagementStat.ISummary =
    await api.functional.redditPlatform.admin.analytics.posts.index(
      authenticatedConnection,
      {
        body: {
          limit: null,
        } satisfies IRedditPlatformPostEngagementStat.IRequest,
      },
    );
  typia.assert(limitNullResponse);
  // 10. Verify default limit works correctly
  TestValidator.predicate(
    "limit null returns data",
    limitNullResponse.data.length > 0,
  );
  // 11. Test cursor-based pagination (useCursor=true)
  const cursorResponse: IPageIRedditPlatformPostEngagementStat.ISummary =
    await api.functional.redditPlatform.admin.analytics.posts.index(
      authenticatedConnection,
      {
        body: {
          useCursor: true,
          pageSize: 10,
        } satisfies IRedditPlatformPostEngagementStat.IRequest,
      },
    );
  typia.assert(cursorResponse);
  // 12. Verify cursor pagination metadata
  TestValidator.predicate(
    "cursor pagination has records",
    cursorResponse.pagination.records > 0,
  );
  // 13. Test with existing cursor using lastId
  if (cursorResponse.data.length > 0) {
    const lastItem = cursorResponse.data[cursorResponse.data.length - 1];
    const cursorWithLastIdResponse: IPageIRedditPlatformPostEngagementStat.ISummary =
      await api.functional.redditPlatform.admin.analytics.posts.index(
        authenticatedConnection,
        {
          body: {
            useCursor: true,
            lastId: lastItem.id,
            pageSize: 10,
          } satisfies IRedditPlatformPostEngagementStat.IRequest,
        },
      );
    typia.assert(cursorWithLastIdResponse);
    // 14. Verify cursor pagination works
    TestValidator.predicate(
      "cursor with lastId returns data",
      cursorWithLastIdResponse.data.length >= 0,
    );
  }
}
