import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformModerationQueue } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationQueue";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformModerationQueue } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformModerationQueue";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_moderation_queue_admin_pagination_validation(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection using available authorization pattern
  const adminConnection: api.IConnection = { host: connection.host };
  // Since no moderation queue creation endpoints are available, we'll test with existing data
  // Test default pagination (page 1, default limit)
  const defaultPage =
    await api.functional.communityPlatform.admin.moderation_queues.index(
      adminConnection,
      {
        body: {
          page: 1,
          limit: undefined,
        } satisfies ICommunityPlatformModerationQueue.IRequest,
      },
    );
  typia.assert(defaultPage);
  // Verify default pagination metadata
  TestValidator.equals(
    "default page should be 1",
    defaultPage.pagination.current,
    1,
  );
  TestValidator.predicate(
    "default limit should be positive",
    defaultPage.pagination.limit > 0,
  );
  TestValidator.predicate(
    "total records should be non-negative",
    defaultPage.pagination.records >= 0,
  );
  TestValidator.predicate(
    "total pages should be non-negative",
    defaultPage.pagination.pages >= 0,
  );
  // Test custom page size
  const customLimit = 20; // Fixed limit for consistent testing
  const customPage =
    await api.functional.communityPlatform.admin.moderation_queues.index(
      adminConnection,
      {
        body: {
          page: 1,
          limit: customLimit,
        } satisfies ICommunityPlatformModerationQueue.IRequest,
      },
    );
  typia.assert(customPage);
  // Verify custom limit adherence
  TestValidator.equals(
    "custom limit should be respected",
    customPage.pagination.limit,
    customLimit,
  );
  // Test multiple page navigation if there are enough records
  if (customPage.pagination.pages > 1) {
    const secondPage =
      await api.functional.communityPlatform.admin.moderation_queues.index(
        adminConnection,
        {
          body: {
            page: 2,
            limit: customLimit,
          } satisfies ICommunityPlatformModerationQueue.IRequest,
        },
      );
    typia.assert(secondPage);
    // Verify second page metadata
    TestValidator.equals(
      "second page number",
      secondPage.pagination.current,
      2,
    );
    TestValidator.equals(
      "limit consistency",
      secondPage.pagination.limit,
      customLimit,
    );
    TestValidator.equals(
      "total records consistency",
      secondPage.pagination.records,
      customPage.pagination.records,
    );
    TestValidator.equals(
      "total pages consistency",
      secondPage.pagination.pages,
      customPage.pagination.pages,
    );
  }
  // Test edge case: page beyond available data
  const beyondPage =
    await api.functional.communityPlatform.admin.moderation_queues.index(
      adminConnection,
      {
        body: {
          page: customPage.pagination.pages + 10,
          limit: customLimit,
        } satisfies ICommunityPlatformModerationQueue.IRequest,
      },
    );
  typia.assert(beyondPage);
  // Verify empty page when requesting beyond available data
  TestValidator.equals(
    "beyond page should be empty",
    beyondPage.data.length,
    0,
  );
  TestValidator.equals(
    "beyond page number should be adjusted",
    beyondPage.pagination.current,
    customPage.pagination.pages + 10,
  );
  TestValidator.equals(
    "total records consistency on beyond page",
    beyondPage.pagination.records,
    customPage.pagination.records,
  );
  // Test pagination calculations
  const expectedPages = Math.ceil(customPage.pagination.records / customLimit);
  TestValidator.equals(
    "page calculation should match",
    customPage.pagination.pages,
    expectedPages,
  );
  // Test data consistency across pages (only if there are multiple pages and data)
  if (customPage.pagination.pages > 1 && customPage.data.length > 0) {
    const allModerationQueues: ICommunityPlatformModerationQueue.ISummary[] =
      [];
    // Collect data from all pages
    for (let page = 1; page <= customPage.pagination.pages; page++) {
      const pageData =
        await api.functional.communityPlatform.admin.moderation_queues.index(
          adminConnection,
          {
            body: {
              page: page,
              limit: customLimit,
            } satisfies ICommunityPlatformModerationQueue.IRequest,
          },
        );
      typia.assert(pageData);
      allModerationQueues.push(...pageData.data);
    }
    // Verify no duplicates across pages
    const uniqueIds = new Set(allModerationQueues.map((item) => item.id));
    TestValidator.equals(
      "no duplicate items across pages",
      uniqueIds.size,
      allModerationQueues.length,
    );
    // Verify total count matches pagination records
    TestValidator.equals(
      "collected items count matches total records",
      allModerationQueues.length,
      customPage.pagination.records,
    );
  }
}
