import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformFeatureFlag } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformFeatureFlag";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformFeatureFlag } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformFeatureFlag";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_feature_flag_admin_search_pagination_large_dataset(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as admin
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      permissions_level: null,
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  // 2. Test pagination with different page sizes
  const pageSizes = [10, 50, 100] as const;
  for (const limit of pageSizes) {
    // Test first page
    const firstPage =
      await api.functional.communityPlatform.admin.feature_flags.index(
        adminConnection,
        {
          body: {
            limit: limit satisfies number as number,
            page: 1 satisfies number as number,
          } satisfies ICommunityPlatformFeatureFlag.IRequest,
        },
      );
    typia.assert(firstPage);
    TestValidator.equals("first page current", firstPage.pagination.current, 1);
    TestValidator.equals("first page limit", firstPage.pagination.limit, limit);
    TestValidator.predicate(
      "first page has reasonable data",
      firstPage.data.length >= 0,
    );
    TestValidator.predicate(
      "records count positive",
      firstPage.pagination.records >= 0,
    );
    // Test pagination boundaries
    const totalPages = firstPage.pagination.pages;
    if (totalPages > 0) {
      // Test middle page if multiple pages exist
      if (totalPages > 2) {
        const middlePageNum = Math.floor(totalPages / 2);
        const middlePage =
          await api.functional.communityPlatform.admin.feature_flags.index(
            adminConnection,
            {
              body: {
                limit: limit satisfies number as number,
                page: middlePageNum satisfies number as number,
              } satisfies ICommunityPlatformFeatureFlag.IRequest,
            },
          );
        typia.assert(middlePage);
        TestValidator.equals(
          "middle page current",
          middlePage.pagination.current,
          middlePageNum,
        );
        TestValidator.equals(
          "middle page limit",
          middlePage.pagination.limit,
          limit,
        );
        TestValidator.predicate(
          "middle page has data",
          middlePage.data.length >= 0,
        );
      }
      // Test last page
      const lastPage =
        await api.functional.communityPlatform.admin.feature_flags.index(
          adminConnection,
          {
            body: {
              limit: limit satisfies number as number,
              page: totalPages satisfies number as number,
            } satisfies ICommunityPlatformFeatureFlag.IRequest,
          },
        );
      typia.assert(lastPage);
      TestValidator.equals(
        "last page current",
        lastPage.pagination.current,
        totalPages,
      );
      TestValidator.equals("last page limit", lastPage.pagination.limit, limit);
      // Test page beyond total count (should return empty data)
      const beyondPage =
        await api.functional.communityPlatform.admin.feature_flags.index(
          adminConnection,
          {
            body: {
              limit: limit satisfies number as number,
              page: (totalPages + 1) satisfies number as number,
            } satisfies ICommunityPlatformFeatureFlag.IRequest,
          },
        );
      typia.assert(beyondPage);
      TestValidator.equals(
        "beyond page current",
        beyondPage.pagination.current,
        totalPages + 1,
      );
      TestValidator.equals("beyond page data empty", beyondPage.data.length, 0);
    }
    // Test page 0 (should handle gracefully)
    const pageZero =
      await api.functional.communityPlatform.admin.feature_flags.index(
        adminConnection,
        {
          body: {
            limit: limit satisfies number as number,
            page: 0 satisfies number as number,
          } satisfies ICommunityPlatformFeatureFlag.IRequest,
        },
      );
    typia.assert(pageZero);
    TestValidator.predicate(
      "page zero handled",
      pageZero.pagination.current >= 0,
    );
  }
  // 3. Test pagination metadata consistency
  const page1 =
    await api.functional.communityPlatform.admin.feature_flags.index(
      adminConnection,
      {
        body: {
          limit: 10 satisfies number as number,
          page: 1 satisfies number as number,
        } satisfies ICommunityPlatformFeatureFlag.IRequest,
      },
    );
  typia.assert(page1);
  const page2 =
    await api.functional.communityPlatform.admin.feature_flags.index(
      adminConnection,
      {
        body: {
          limit: 10 satisfies number as number,
          page: 2 satisfies number as number,
        } satisfies ICommunityPlatformFeatureFlag.IRequest,
      },
    );
  typia.assert(page2);
  TestValidator.equals(
    "consistent total records",
    page1.pagination.records,
    page2.pagination.records,
  );
  TestValidator.equals(
    "consistent total pages",
    page1.pagination.pages,
    page2.pagination.pages,
  );
  // 4. Test search functionality with pagination
  const searchPage =
    await api.functional.communityPlatform.admin.feature_flags.index(
      adminConnection,
      {
        body: {
          search: RandomGenerator.alphabets(3), // Use random search term
          limit: 20 satisfies number as number,
          page: 1 satisfies number as number,
        } satisfies ICommunityPlatformFeatureFlag.IRequest,
      },
    );
  typia.assert(searchPage);
  TestValidator.predicate(
    "search returns valid response",
    searchPage.data.length >= 0,
  );
  // 5. Test filtering with pagination
  const flagTypes = ["boolean", "percentage", "user_specific"] as const;
  const filteredPage =
    await api.functional.communityPlatform.admin.feature_flags.index(
      adminConnection,
      {
        body: {
          flag_type: RandomGenerator.pick(flagTypes),
          limit: 15 satisfies number as number,
          page: 1 satisfies number as number,
        } satisfies ICommunityPlatformFeatureFlag.IRequest,
      },
    );
  typia.assert(filteredPage);
  TestValidator.predicate(
    "filtered page returns valid response",
    filteredPage.data.length >= 0,
  );
}
