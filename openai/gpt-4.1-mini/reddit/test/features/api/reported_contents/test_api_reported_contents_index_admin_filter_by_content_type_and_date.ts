import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReport";
import type { ICommunityPlatformReportReason } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportReason";
import type { ICommunityPlatformReportedContent } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportedContent";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformReportedContent } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformReportedContent";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_reported_contents_index_admin_filter_by_content_type_and_date(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin authentication
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPassword123!",
      displayName: "AdminUser",
      bio: null,
      avatarUrl: null,
    },
  });
  typia.assert(adminAuth);
  adminConnection.headers ??= {};
  adminConnection.headers.Authorization = adminAuth.token.access;
  // 2. Prepare date filters
  const now = new Date();
  const daysAgo = (days: number): string =>
    new Date(now.getTime() - days * 86400000).toISOString();
  const createdAfter = daysAgo(7); // 7 days ago
  const createdBefore = daysAgo(1); // 1 day ago
  // 3. Request reported contents with filtering by contentType 'post', date range and pagination
  const page = 1;
  const limit = 5;
  const requestBody = {
    contentType: "post",
    createdAfter,
    createdBefore,
    page,
    limit,
  } satisfies ICommunityPlatformReportedContent.IRequest;
  const response =
    await api.functional.communityPlatform.admin.reportedContents.index(
      adminConnection,
      { body: requestBody },
    );
  typia.assert(response);
  // 4. Validate pagination metadata correctness
  const { pagination, data } = response;
  TestValidator.predicate(
    "pagination current page is correct",
    pagination.current === page,
  );
  TestValidator.predicate(
    "pagination limit is correct",
    pagination.limit === limit,
  );
  TestValidator.predicate(
    "pagination pages is correct",
    pagination.pages ===
      (pagination.records > 0 ? Math.ceil(pagination.records / limit) : 0),
  );
  // 5. Validate all returned reported contents have contentType 'post'
  for (const item of data) {
    // contentType 'post' means reportedPost is present and reportedComment is null
    TestValidator.predicate(
      "reportedPost is present",
      item.reportedPost !== null && item.reportedComment === null,
    );
    // Validate createdAt falls within the date range
    const createdAt = new Date(item.created_at).toISOString();
    TestValidator.predicate(
      "created_at is within filter range",
      createdAt >= createdAfter && createdAt <= createdBefore,
    );
  }
  // 6. Edge case tests for isDeleted filter
  for (const isDeletedValue of [true, false, null]) {
    const edgeRequest = {
      contentType: "post",
      isDeleted: isDeletedValue,
      page: 1,
      limit: 10,
    } satisfies ICommunityPlatformReportedContent.IRequest;
    const edgeResponse =
      await api.functional.communityPlatform.admin.reportedContents.index(
        adminConnection,
        { body: edgeRequest },
      );
    typia.assert(edgeResponse);
    for (const item of edgeResponse.data) {
      if (isDeletedValue === null) {
        // When null, both deleted and not deleted are allowed
        TestValidator.predicate(
          "item deleted_at is null or string",
          item.deleted_at === null || typeof item.deleted_at === "string",
        );
      } else if (isDeletedValue === true) {
        // When true, deleted_at must be a non-null string
        TestValidator.predicate(
          "item deleted_at is string when isDeleted true",
          typeof item.deleted_at === "string",
        );
      } else if (isDeletedValue === false) {
        // When false, deleted_at must be null
        TestValidator.predicate(
          "item deleted_at is null when isDeleted false",
          item.deleted_at === null,
        );
      }
    }
  }
}
