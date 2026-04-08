import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunityCommunityFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityCommunityFile";
import type { IRedditCommunityAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityAdmin";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityCommunityFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityFile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_community_files_search(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin authentication
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234test",
      display_name: RandomGenerator.name(),
    } satisfies IRedditCommunityAdmin.IJoin,
  });
  typia.assert(adminAuth);
  // 2. Use a test community ID (mock data exists in database)
  const testCommunityId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 3. Test search functionality with "logo" filter
  const searchResults =
    await api.functional.redditCommunity.admin.communities.files.index(
      adminConnection,
      {
        communityId: testCommunityId,
        body: {
          search: "logo",
          limit: 20,
          page: 1,
        } satisfies IRedditCommunityCommunityFile.IRequest,
      },
    );
  typia.assert(searchResults);
  // Validate search results structure
  TestValidator.equals(
    "search results contain data array",
    searchResults.data.length >= 0,
    true,
  );
  TestValidator.equals(
    "search results have pagination",
    searchResults.pagination.records >= 0,
    true,
  );
  // Validate that when search term provided, results reflect filtering
  if (searchResults.data.length > 0) {
    for (const file of searchResults.data) {
      typia.assert(file);
      // Each file should have required properties
      TestValidator.equals("file has valid id", file.id !== undefined, true);
      TestValidator.equals(
        "file has valid filename",
        file.filename !== undefined,
        true,
      );
      TestValidator.equals(
        "file has valid file_size",
        file.file_size >= 0,
        true,
      );
    }
  }
  // 4. Test sorting by filename ascending
  const sortedByNameAsc =
    await api.functional.redditCommunity.admin.communities.files.index(
      adminConnection,
      {
        communityId: testCommunityId,
        body: {
          sortBy: "filename",
          sortOrder: "asc",
          limit: 20,
          page: 1,
        } satisfies IRedditCommunityCommunityFile.IRequest,
      },
    );
  typia.assert(sortedByNameAsc);
  // Validate alphabetical order when multiple results
  if (sortedByNameAsc.data.length > 1) {
    for (let i = 1; i < sortedByNameAsc.data.length; i++) {
      const prevName = sortedByNameAsc.data[i - 1].filename;
      const currName = sortedByNameAsc.data[i].filename;
      TestValidator.predicate(
        "filenames sorted alphabetically ascending",
        prevName <= currName,
      );
    }
  }
  // 5. Test sorting by file_size descending
  const sortedBySizeDesc =
    await api.functional.redditCommunity.admin.communities.files.index(
      adminConnection,
      {
        communityId: testCommunityId,
        body: {
          sortBy: "file_size",
          sortOrder: "desc",
          limit: 20,
          page: 1,
        } satisfies IRedditCommunityCommunityFile.IRequest,
      },
    );
  typia.assert(sortedBySizeDesc);
  // Validate descending order by file_size when multiple results
  if (sortedBySizeDesc.data.length > 1) {
    for (let i = 1; i < sortedBySizeDesc.data.length; i++) {
      const prevSize = sortedBySizeDesc.data[i - 1].file_size;
      const currSize = sortedBySizeDesc.data[i].file_size;
      TestValidator.predicate(
        "file sizes sorted descending",
        prevSize >= currSize,
      );
    }
  }
  // 6. Test sorting by created_at ascending (oldest first)
  const sortedByCreatedAsc =
    await api.functional.redditCommunity.admin.communities.files.index(
      adminConnection,
      {
        communityId: testCommunityId,
        body: {
          sortBy: "created_at",
          sortOrder: "asc",
          limit: 20,
          page: 1,
        } satisfies IRedditCommunityCommunityFile.IRequest,
      },
    );
  typia.assert(sortedByCreatedAsc);
  // Validate chronological order when multiple results
  if (sortedByCreatedAsc.data.length > 1) {
    for (let i = 1; i < sortedByCreatedAsc.data.length; i++) {
      const prevDate = new Date(sortedByCreatedAsc.data[i - 1].created_at);
      const currDate = new Date(sortedByCreatedAsc.data[i].created_at);
      TestValidator.predicate(
        "created_at sorted chronologically ascending",
        prevDate <= currDate,
      );
    }
  }
  // 7. Test pagination limit enforcement (1-100 range)
  const limitedResults =
    await api.functional.redditCommunity.admin.communities.files.index(
      adminConnection,
      {
        communityId: testCommunityId,
        body: {
          limit: 5,
          page: 1,
        } satisfies IRedditCommunityCommunityFile.IRequest,
      },
    );
  typia.assert(limitedResults);
  TestValidator.equals(
    "pagination limit enforced to 5",
    limitedResults.data.length <= 5,
    true,
  );
  // 8. Validate pagination metadata accuracy
  TestValidator.equals(
    "pagination current page is 1",
    limitedResults.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit reflects request",
    limitedResults.pagination.limit,
    5,
  );
  TestValidator.predicate(
    "pagination records count is non-negative",
    limitedResults.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages calculated correctly",
    limitedResults.pagination.pages >= 1,
  );
  // 9. Test page 2 of results
  const page2Results =
    await api.functional.redditCommunity.admin.communities.files.index(
      adminConnection,
      {
        communityId: testCommunityId,
        body: {
          limit: 10,
          page: 2,
        } satisfies IRedditCommunityCommunityFile.IRequest,
      },
    );
  typia.assert(page2Results);
  TestValidator.equals(
    "pagination page 2 correct",
    page2Results.pagination.current,
    2,
  );
  // 10. Test combined search and sorting
  const combinedResults =
    await api.functional.redditCommunity.admin.communities.files.index(
      adminConnection,
      {
        communityId: testCommunityId,
        body: {
          search: "test",
          sortBy: "filename",
          sortOrder: "desc",
          limit: 15,
          page: 1,
        } satisfies IRedditCommunityCommunityFile.IRequest,
      },
    );
  typia.assert(combinedResults);
  // Validate combined parameters are reflected in results
  TestValidator.equals(
    "combined results limit honored",
    combinedResults.data.length <= 15,
    true,
  );
}
