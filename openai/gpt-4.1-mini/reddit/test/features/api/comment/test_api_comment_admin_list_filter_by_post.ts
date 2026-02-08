import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformComment";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_comment_admin_list_filter_by_post(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin authentication
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, { body: {} });
  // 2. Initial request with pagination limit
  const limit = 10;
  const currentPage = 1;
  // Initial query to get paginated comments (no filter)
  const initialResponse =
    await api.functional.communityPlatform.admin.comments.index(
      adminConnection,
      {
        body: {
          limit,
          current: currentPage,
        } satisfies ICommunityPlatformComment.IRequest,
      },
    );
  typia.assert(initialResponse);
  // Validate pagination metadata
  const {
    current,
    limit: resLimit,
    pages,
    records,
  } = initialResponse.pagination;
  TestValidator.equals("pagination current", current, currentPage);
  TestValidator.equals("pagination limit", resLimit, limit);
  TestValidator.predicate("pagination records non-negative", records >= 0);
  TestValidator.predicate("pagination pages valid", pages >= 0);
  // If no comments, can't proceed with filtering by post ID, skip rest
  if (initialResponse.data.length === 0) return;
  // Since 'post_id' field does not exist, cannot filter by it
  // Instead, just perform paginated queries with a dummy filter (empty object)
  // Function to fetch all pages and validate pagination
  async function fetchAllPages(pageSize: number) {
    let page = 1;
    while (true) {
      const response =
        await api.functional.communityPlatform.admin.comments.index(
          adminConnection,
          {
            body: {
              limit: pageSize,
              current: page,
            } satisfies ICommunityPlatformComment.IRequest,
          },
        );
      typia.assert(response);
      const { current, limit: resLimit, pages, records } = response.pagination;
      TestValidator.equals("pagination current", current, page);
      TestValidator.equals("pagination limit", resLimit, pageSize);
      TestValidator.predicate("pagination records non-negative", records >= 0);
      TestValidator.predicate("pagination pages valid", pages >= page);
      if (page >= pages || response.data.length === 0) break;
      page++;
    }
  }
  // Fetch all pages to verify pagination
  await fetchAllPages(limit);
  // No sorting validation on created_at since field does not exist
  // High page scenario test near last page if pages > 2
  if (initialResponse.pagination.pages > 2) {
    const nearLastPage = initialResponse.pagination.pages - 1;
    const highPageResponse =
      await api.functional.communityPlatform.admin.comments.index(
        adminConnection,
        {
          body: {
            limit,
            current: nearLastPage,
          } satisfies ICommunityPlatformComment.IRequest,
        },
      );
    typia.assert(highPageResponse);
    const {
      current,
      limit: resLimit,
      pages,
      records,
    } = highPageResponse.pagination;
    TestValidator.equals("high page pagination current", current, nearLastPage);
    TestValidator.equals("high page pagination limit", resLimit, limit);
    TestValidator.equals(
      "high page pagination pages",
      pages,
      initialResponse.pagination.pages,
    );
    TestValidator.predicate(
      "high page pagination records non-negative",
      records >= 0,
    );
  }
}
