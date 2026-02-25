import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformAdmin";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_admin_search_basic_pagination(
  connection: api.IConnection,
): Promise<void> {
  // Use base connection since admin authentication may not be available
  const adminConnection: api.IConnection = { host: connection.host };
  // Test pagination with different page sizes
  const pageSizes = [5, 10, 15] as const;
  for (const limit of pageSizes) {
    // Test first page
    const page1Response = await api.functional.communityPlatform.admins.index(
      adminConnection,
      {
        body: {
          page: 1,
          limit: limit,
          sort_by: "created_at",
          sort_order: "asc",
        } satisfies ICommunityPlatformAdmin.IRequest,
      },
    );
    typia.assert(page1Response);
    // Validate pagination metadata structure
    TestValidator.equals(
      `page 1 limit ${limit} current page`,
      page1Response.pagination.current,
      1,
    );
    TestValidator.equals(
      `page 1 limit ${limit} page limit`,
      page1Response.pagination.limit,
      limit,
    );
    TestValidator.predicate(
      `page 1 limit ${limit} has non-negative total records`,
      page1Response.pagination.records >= 0,
    );
    TestValidator.predicate(
      `page 1 limit ${limit} has non-negative total pages`,
      page1Response.pagination.pages >= 0,
    );
    // Validate data array structure
    TestValidator.predicate(
      `page 1 limit ${limit} has data array`,
      Array.isArray(page1Response.data),
    );
    TestValidator.predicate(
      `page 1 limit ${limit} data length matches limit`,
      page1Response.data.length <= limit,
    );
    // Test second page if applicable
    if (page1Response.pagination.pages > 1) {
      const page2Response = await api.functional.communityPlatform.admins.index(
        adminConnection,
        {
          body: {
            page: 2,
            limit: limit,
            sort_by: "created_at",
            sort_order: "asc",
          } satisfies ICommunityPlatformAdmin.IRequest,
        },
      );
      typia.assert(page2Response);
      TestValidator.equals(
        `page 2 limit ${limit} current page`,
        page2Response.pagination.current,
        2,
      );
      TestValidator.equals(
        `page 2 limit ${limit} page limit consistency`,
        page2Response.pagination.limit,
        limit,
      );
      TestValidator.equals(
        `page 2 limit ${limit} total records consistency`,
        page2Response.pagination.records,
        page1Response.pagination.records,
      );
      TestValidator.equals(
        `page 2 limit ${limit} total pages consistency`,
        page2Response.pagination.pages,
        page1Response.pagination.pages,
      );
    }
    // Test last page if multiple pages exist
    const lastPage = page1Response.pagination.pages;
    if (lastPage > 1) {
      const lastPageResponse =
        await api.functional.communityPlatform.admins.index(adminConnection, {
          body: {
            page: lastPage,
            limit: limit,
            sort_by: "created_at",
            sort_order: "asc",
          } satisfies ICommunityPlatformAdmin.IRequest,
        });
      typia.assert(lastPageResponse);
      TestValidator.equals(
        `last page limit ${limit} current page`,
        lastPageResponse.pagination.current,
        lastPage,
      );
      TestValidator.predicate(
        `last page limit ${limit} has reasonable data count`,
        lastPageResponse.data.length <= limit,
      );
    }
  }
  // Test default pagination (no page/limit specified)
  const defaultResponse = await api.functional.communityPlatform.admins.index(
    adminConnection,
    {
      body: {
        sort_by: "created_at",
        sort_order: "asc",
      } satisfies ICommunityPlatformAdmin.IRequest,
    },
  );
  typia.assert(defaultResponse);
  TestValidator.predicate(
    "default response has valid pagination metadata",
    defaultResponse.pagination.current >= 1 &&
      defaultResponse.pagination.limit > 0 &&
      defaultResponse.pagination.records >= 0 &&
      defaultResponse.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "default response has valid data array",
    Array.isArray(defaultResponse.data),
  );
}
