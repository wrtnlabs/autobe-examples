import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityBan";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformCommunityBan";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_community_ban_management_pagination_validation(
  connection: api.IConnection,
): Promise<void> {
  // Create admin authentication
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      permissions_level: null,
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  typia.assert(admin);
  // Generate community ID
  const communityId = typia.random<string & tags.Format<"uuid">>();
  // Test pagination with different limits
  const testLimits = [5, 10] as const;
  for (const limit of testLimits) {
    // Test first page
    const page1 =
      await api.functional.communityPlatform.admin.communities.bans.index(
        adminConnection,
        {
          communityId,
          body: {
            page: 1,
            limit: limit satisfies number,
          } satisfies ICommunityPlatformCommunityBan.IRequest,
        },
      );
    typia.assert(page1);
    // Validate pagination metadata
    TestValidator.equals(
      `page ${limit} - pagination current`,
      page1.pagination.current,
      1,
    );
    TestValidator.equals(
      `page ${limit} - pagination limit`,
      page1.pagination.limit,
      limit,
    );
    TestValidator.predicate(
      `page ${limit} - records non-negative`,
      page1.pagination.records >= 0,
    );
    TestValidator.predicate(
      `page ${limit} - pages non-negative`,
      page1.pagination.pages >= 0,
    );
    // Calculate expected pages
    const expectedPages = Math.ceil(page1.pagination.records / limit);
    TestValidator.equals(
      `page ${limit} - total pages calculation`,
      page1.pagination.pages,
      expectedPages,
    );
    // Test navigation if multiple pages exist
    if (page1.pagination.pages > 1) {
      // Test second page
      const page2 =
        await api.functional.communityPlatform.admin.communities.bans.index(
          adminConnection,
          {
            communityId,
            body: {
              page: 2,
              limit: limit satisfies number,
            } satisfies ICommunityPlatformCommunityBan.IRequest,
          },
        );
      typia.assert(page2);
      TestValidator.equals(
        `page ${limit} - page 2 current`,
        page2.pagination.current,
        2,
      );
      TestValidator.equals(
        `page ${limit} - page 2 limit`,
        page2.pagination.limit,
        limit,
      );
      TestValidator.equals(
        `page ${limit} - total records consistent`,
        page2.pagination.records,
        page1.pagination.records,
      );
      TestValidator.equals(
        `page ${limit} - total pages consistent`,
        page2.pagination.pages,
        page1.pagination.pages,
      );
      // Verify data is different between pages
      if (page1.data.length > 0 && page2.data.length > 0) {
        TestValidator.notEquals(
          `page ${limit} - different data between pages`,
          page1.data[0]?.id,
          page2.data[0]?.id,
        );
      }
    }
    // Test edge case: page beyond available data
    const beyondPage = page1.pagination.pages + 1;
    const beyondResult =
      await api.functional.communityPlatform.admin.communities.bans.index(
        adminConnection,
        {
          communityId,
          body: {
            page: beyondPage,
            limit: limit satisfies number,
          } satisfies ICommunityPlatformCommunityBan.IRequest,
        },
      );
    typia.assert(beyondResult);
    // Should return empty data but same pagination metadata
    TestValidator.equals(
      `page ${limit} - beyond page data empty`,
      beyondResult.data.length,
      0,
    );
    TestValidator.equals(
      `page ${limit} - beyond page current`,
      beyondResult.pagination.current,
      beyondPage,
    );
    TestValidator.equals(
      `page ${limit} - beyond page limit`,
      beyondResult.pagination.limit,
      limit,
    );
    TestValidator.equals(
      `page ${limit} - beyond page records`,
      beyondResult.pagination.records,
      page1.pagination.records,
    );
    TestValidator.equals(
      `page ${limit} - beyond page pages`,
      beyondResult.pagination.pages,
      page1.pagination.pages,
    );
  }
  // Test zero results scenario with filtering
  const zeroResults =
    await api.functional.communityPlatform.admin.communities.bans.index(
      adminConnection,
      {
        communityId,
        body: {
          status: "revoked",
          page: 1,
          limit: 10 satisfies number,
        } satisfies ICommunityPlatformCommunityBan.IRequest,
      },
    );
  typia.assert(zeroResults);
  TestValidator.equals("zero results - data empty", zeroResults.data.length, 0);
  TestValidator.equals(
    "zero results - current page",
    zeroResults.pagination.current,
    1,
  );
  TestValidator.equals(
    "zero results - limit",
    zeroResults.pagination.limit,
    10,
  );
  TestValidator.equals(
    "zero results - total records",
    zeroResults.pagination.records,
    0,
  );
  TestValidator.equals(
    "zero results - total pages",
    zeroResults.pagination.pages,
    0,
  );
  // Test single page scenario with small limit
  const singlePage =
    await api.functional.communityPlatform.admin.communities.bans.index(
      adminConnection,
      {
        communityId,
        body: {
          page: 1,
          limit: 100 satisfies number,
        } satisfies ICommunityPlatformCommunityBan.IRequest,
      },
    );
  typia.assert(singlePage);
  TestValidator.equals(
    "single page - current page",
    singlePage.pagination.current,
    1,
  );
  TestValidator.equals("single page - limit", singlePage.pagination.limit, 100);
  TestValidator.predicate(
    "single page - single page only",
    singlePage.pagination.pages <= 1,
  );
}
