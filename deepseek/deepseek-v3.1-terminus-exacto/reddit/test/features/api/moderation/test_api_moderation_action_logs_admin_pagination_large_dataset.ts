import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformModerationActionLog } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationActionLog";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformModerationActionLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformModerationActionLog";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_moderation_action_logs_admin_pagination_large_dataset(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      permissions_level: null,
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  // Test basic pagination functionality
  const pageSize = 10;
  // Test first page with default parameters
  const firstPage =
    await api.functional.communityPlatform.admin.moderation_action_logs.index(
      adminConnection,
      {
        body: {
          page: 1,
          limit: pageSize,
        } satisfies ICommunityPlatformModerationActionLog.IRequest,
      },
    );
  typia.assert(firstPage);
  // Validate pagination structure
  TestValidator.predicate(
    "pagination structure valid",
    firstPage.pagination.current >= 0 &&
      firstPage.pagination.limit >= 0 &&
      firstPage.pagination.records >= 0 &&
      firstPage.pagination.pages >= 0,
  );
  // Test data structure
  if (firstPage.data.length > 0) {
    typia.assert(firstPage.data[0]);
  }
  // Test middle page if multiple pages exist
  if (firstPage.pagination.pages > 1) {
    const middlePageNum = Math.max(
      1,
      Math.floor(firstPage.pagination.pages / 2),
    );
    const middlePage =
      await api.functional.communityPlatform.admin.moderation_action_logs.index(
        adminConnection,
        {
          body: {
            page: middlePageNum,
            limit: pageSize,
          } satisfies ICommunityPlatformModerationActionLog.IRequest,
        },
      );
    typia.assert(middlePage);
    TestValidator.equals(
      "middle page current page",
      middlePage.pagination.current,
      middlePageNum,
    );
    TestValidator.equals(
      "middle page limit consistent",
      middlePage.pagination.limit,
      pageSize,
    );
    TestValidator.equals(
      "total records consistent",
      middlePage.pagination.records,
      firstPage.pagination.records,
    );
    TestValidator.equals(
      "total pages consistent",
      middlePage.pagination.pages,
      firstPage.pagination.pages,
    );
  }
  // Test last page if multiple pages exist
  if (firstPage.pagination.pages > 1) {
    const lastPage =
      await api.functional.communityPlatform.admin.moderation_action_logs.index(
        adminConnection,
        {
          body: {
            page: firstPage.pagination.pages,
            limit: pageSize,
          } satisfies ICommunityPlatformModerationActionLog.IRequest,
        },
      );
    typia.assert(lastPage);
    TestValidator.equals(
      "last page current page",
      lastPage.pagination.current,
      firstPage.pagination.pages,
    );
    TestValidator.equals(
      "last page limit consistent",
      lastPage.pagination.limit,
      pageSize,
    );
    TestValidator.equals(
      "total records consistent",
      lastPage.pagination.records,
      firstPage.pagination.records,
    );
    TestValidator.equals(
      "total pages consistent",
      lastPage.pagination.pages,
      firstPage.pagination.pages,
    );
    // Last page should have valid data count
    const expectedLastPageRecords =
      firstPage.pagination.records % pageSize || pageSize;
    TestValidator.predicate(
      "last page data count valid",
      lastPage.data.length <= pageSize && lastPage.data.length > 0,
    );
  }
  // Test empty result set with non-existent filter
  const emptyResult =
    await api.functional.communityPlatform.admin.moderation_action_logs.index(
      adminConnection,
      {
        body: {
          page: 1,
          limit: pageSize,
          moderator_id: typia.random<string & tags.Format<"uuid">>(), // Non-existent moderator
        } satisfies ICommunityPlatformModerationActionLog.IRequest,
      },
    );
  typia.assert(emptyResult);
  TestValidator.equals("empty result data count", emptyResult.data.length, 0);
  TestValidator.equals(
    "empty result records count",
    emptyResult.pagination.records,
    0,
  );
  TestValidator.equals(
    "empty result pages count",
    emptyResult.pagination.pages,
    0,
  );
  // Test single page scenario with large limit
  const singlePageResult =
    await api.functional.communityPlatform.admin.moderation_action_logs.index(
      adminConnection,
      {
        body: {
          page: 1,
          limit: 100, // Large limit to potentially get all records in one page
        } satisfies ICommunityPlatformModerationActionLog.IRequest,
      },
    );
  typia.assert(singlePageResult);
  TestValidator.predicate(
    "single page data count valid",
    singlePageResult.data.length <= singlePageResult.pagination.records,
  );
  // Test invalid page parameter (should handle gracefully)
  const invalidPageResult =
    await api.functional.communityPlatform.admin.moderation_action_logs.index(
      adminConnection,
      {
        body: {
          page: 0, // Invalid page number
          limit: pageSize,
        } satisfies ICommunityPlatformModerationActionLog.IRequest,
      },
    );
  typia.assert(invalidPageResult);
  // API should handle invalid page gracefully
  TestValidator.predicate(
    "invalid page handled gracefully",
    invalidPageResult.pagination.current >= 1,
  );
  // Test different page sizes
  const smallPageSize = 5;
  const smallPageResult =
    await api.functional.communityPlatform.admin.moderation_action_logs.index(
      adminConnection,
      {
        body: {
          page: 1,
          limit: smallPageSize,
        } satisfies ICommunityPlatformModerationActionLog.IRequest,
      },
    );
  typia.assert(smallPageResult);
  TestValidator.equals(
    "small page size limit",
    smallPageResult.pagination.limit,
    smallPageSize,
  );
  TestValidator.predicate(
    "small page data count valid",
    smallPageResult.data.length <= smallPageSize,
  );
}
