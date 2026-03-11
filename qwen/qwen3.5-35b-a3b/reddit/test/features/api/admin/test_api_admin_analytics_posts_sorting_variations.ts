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

export async function test_api_admin_analytics_posts_sorting_variations(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin authentication
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: RandomGenerator.alphaNumeric(16),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph(),
      avatar_url: typia.random<string & tags.Format<"uri">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: (typia.random<string & tags.Format<"uri">>()),
    } satisfies IRedditPlatformAdmin.IJoin,
  });
  typia.assert(admin);
  // Use the authenticated connection for API calls
  // adminConnection.headers are updated internally by authorize_admin_join
  // Now we have admin.token for creating new connection if needed
  // 2. Test each sortBy option with both asc and desc
  const sortByOptions: Array<
    | "view_count"
    | "upvote_count"
    | "downvote_count"
    | "last_viewed_at"
    | "created_at"
  > = [
    "view_count",
    "upvote_count",
    "downvote_count",
    "last_viewed_at",
    "created_at",
  ];
  const sortOrderOptions: Array<"asc" | "desc"> = ["asc", "desc"];
  // For each sorting option, verify it works
  for (const sortBy of sortByOptions) {
    for (const sortOrder of sortOrderOptions) {
      // Query with sorting
      const response =
        await api.functional.redditPlatform.admin.analytics.posts.index(
          adminConnection,
          {
            body: {
              sortBy,
              sortOrder,
              limit: 50,
            } satisfies IRedditPlatformPostEngagementStat.IRequest,
          },
        );
      typia.assert(response);
      // Validate pagination metadata
      TestValidator.equals(
        `${sortBy}_${sortOrder} pagination limit`,
        response.pagination.limit,
        50,
      );
      TestValidator.predicate(
        `${sortBy}_${sortOrder} has valid records count`,
        () => response.pagination.records >= 0,
      );
      TestValidator.predicate(
        `${sortBy}_${sortOrder} has valid pages`,
        () => response.pagination.pages >= 0,
      );
    }
  }
  // Test specific sorting behavior for view_count
  {
    // Get descending view count
    const descResponse =
      await api.functional.redditPlatform.admin.analytics.posts.index(
        adminConnection,
        {
          body: {
            sortBy: "view_count",
            sortOrder: "desc",
            limit: 10,
          } satisfies IRedditPlatformPostEngagementStat.IRequest,
        },
      );
    typia.assert(descResponse);
    // Get ascending view count
    const ascResponse =
      await api.functional.redditPlatform.admin.analytics.posts.index(
        adminConnection,
        {
          body: {
            sortBy: "view_count",
            sortOrder: "asc",
            limit: 10,
          } satisfies IRedditPlatformPostEngagementStat.IRequest,
        },
      );
    typia.assert(ascResponse);
    // Verify descending order has higher values first
    if (descResponse.data.length > 1) {
      for (let i = 0; i < descResponse.data.length - 1; i++) {
        TestValidator.predicate(
          `descending view_count ${i} >= ${i + 1}`,
          () =>
            descResponse.data[i].view_count >=
            descResponse.data[i + 1].view_count,
        );
      }
    }
    // Verify ascending order has lower values first
    if (ascResponse.data.length > 1) {
      for (let i = 0; i < ascResponse.data.length - 1; i++) {
        TestValidator.predicate(
          `ascending view_count ${i} <= ${i + 1}`,
          () =>
            ascResponse.data[i].view_count <=
            descResponse.data[i + 1].view_count,
        );
      }
    }
  }
  // Test with cursor pagination as well
  {
    const cursorResponse =
      await api.functional.redditPlatform.admin.analytics.posts.index(
        adminConnection,
        {
          body: {
            sortBy: "view_count",
            sortOrder: "desc",
            limit: 5,
            useCursor: true,
          } satisfies IRedditPlatformPostEngagementStat.IRequest,
        },
      );
    typia.assert(cursorResponse);
    TestValidator.equals(
      "cursor pagination limit",
      cursorResponse.pagination.limit,
      5,
    );
  }
}