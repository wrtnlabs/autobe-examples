import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunityFileCdnLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityFileCdnLog";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityFile";
import type { IRedditCommunityFileCdnLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityFileCdnLog";
import type { IRedditCommunityFileOfCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityFileOfCommunity";
import type { IRedditCommunityFileOfUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityFileOfUser";
import type { IRedditCommunityFileThumbnail } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityFileThumbnail";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUserProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_community_member_files_create } from "../../../generate/generate_random_reddit_community_member_files_create";
import { prepare_random_reddit_community_file } from "../../../prepare/prepare_random_reddit_community_file";

export async function test_api_file_cdn_logs_filtering_sorting(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create authenticated member account
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditCommunityMember.IJoin,
  });
  typia.assert(memberAuth);
  // 2. Create a file to retrieve CDN logs for
  const fileConnection: api.IConnection = { host: connection.host };
  fileConnection.headers = {
    ...fileConnection.headers,
    Authorization: memberAuth.token.access,
  };
  const file = await generate_random_reddit_community_member_files_create(
    fileConnection,
    {
      body: {
        file_type: "post",
        owner_id: typia.random<string & tags.Format<"uuid">>(),
        file_uri: typia.random<string & tags.Format<"uri">>(),
      } satisfies IRedditCommunityFile.ICreate,
    },
  );
  typia.assert(file);
  // 3. Test filtering by cache_status
  const cacheStatusFilterTest =
    await api.functional.redditCommunity.member.files.cdn_logs.index(
      fileConnection,
      {
        fileId: file.id,
        body: {
          cache_status: "HIT",
          page: 1,
          per_page: 20,
        } satisfies IRedditCommunityFileCdnLog.IRequest,
      },
    );
  typia.assert(cacheStatusFilterTest);
  // 4. Test filtering by date range (last 30 days)
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const dateRangeFilterTest =
    await api.functional.redditCommunity.member.files.cdn_logs.index(
      fileConnection,
      {
        fileId: file.id,
        body: {
          delivered_at_start: thirtyDaysAgo.toISOString(),
          delivered_at_end: now.toISOString(),
          page: 1,
          per_page: 20,
        } satisfies IRedditCommunityFileCdnLog.IRequest,
      },
    );
  typia.assert(dateRangeFilterTest);
  // 5. Test filtering by HTTP status code
  const httpStatusFilterTest =
    await api.functional.redditCommunity.member.files.cdn_logs.index(
      fileConnection,
      {
        fileId: file.id,
        body: {
          http_status_code: 200,
          page: 1,
          per_page: 20,
        } satisfies IRedditCommunityFileCdnLog.IRequest,
      },
    );
  typia.assert(httpStatusFilterTest);
  // 6. Test sorting by delivered_at ascending (oldest first)
  const sortAscendingTest =
    await api.functional.redditCommunity.member.files.cdn_logs.index(
      fileConnection,
      {
        fileId: file.id,
        body: {
          sort: "delivered_at",
          order: "asc",
          page: 1,
          per_page: 20,
        } satisfies IRedditCommunityFileCdnLog.IRequest,
      },
    );
  typia.assert(sortAscendingTest);
  // 7. Test sorting by delivered_at descending (newest first)
  const sortDescendingTest =
    await api.functional.redditCommunity.member.files.cdn_logs.index(
      fileConnection,
      {
        fileId: file.id,
        body: {
          sort: "delivered_at",
          order: "desc",
          page: 1,
          per_page: 20,
        } satisfies IRedditCommunityFileCdnLog.IRequest,
      },
    );
  typia.assert(sortDescendingTest);
  // 8. Test sorting by response_size_bytes (largest first)
  const sizeSortTest =
    await api.functional.redditCommunity.member.files.cdn_logs.index(
      fileConnection,
      {
        fileId: file.id,
        body: {
          sort: "response_size_bytes",
          order: "desc",
          page: 1,
          per_page: 20,
        } satisfies IRedditCommunityFileCdnLog.IRequest,
      },
    );
  typia.assert(sizeSortTest);
  // 9. Test pagination - page 1
  const paginationTest1 =
    await api.functional.redditCommunity.member.files.cdn_logs.index(
      fileConnection,
      {
        fileId: file.id,
        body: {
          page: 1,
          per_page: 5,
        } satisfies IRedditCommunityFileCdnLog.IRequest,
      },
    );
  typia.assert(paginationTest1);
  // 10. Test pagination - page 2
  const paginationTest2 =
    await api.functional.redditCommunity.member.files.cdn_logs.index(
      fileConnection,
      {
        fileId: file.id,
        body: {
          page: 2,
          per_page: 5,
        } satisfies IRedditCommunityFileCdnLog.IRequest,
      },
    );
  typia.assert(paginationTest2);
  // 11. Test combination of filters
  const combinedFiltersTest =
    await api.functional.redditCommunity.member.files.cdn_logs.index(
      fileConnection,
      {
        fileId: file.id,
        body: {
          cache_status: "MISS",
          http_status_code: 200,
          response_size_bytes_min: 0,
          page: 1,
          per_page: 20,
        } satisfies IRedditCommunityFileCdnLog.IRequest,
      },
    );
  typia.assert(combinedFiltersTest);
  // 12. Validate pagination metadata
  TestValidator.predicate(
    "pagination has valid current page (>= 1)",
    paginationTest1.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination has valid limit (>= 1)",
    paginationTest1.pagination.limit >= 1,
  );
  TestValidator.predicate(
    "pagination has valid records count (>= 0)",
    paginationTest1.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination has valid pages count (>= 0)",
    paginationTest1.pagination.pages >= 0,
  );
  TestValidator.equals(
    "pagination page 2 has current of 2",
    paginationTest2.pagination.current,
    2,
  );
  // 13. Validate response size sorting order (descending should have larger values first)
  if (sizeSortTest.data.length > 1) {
    const firstSize = sizeSortTest.data[0].responseSizeBytes;
    const secondSize = sizeSortTest.data[1].responseSizeBytes;
    TestValidator.predicate(
      "response size descending order valid (first >= second)",
      firstSize >= secondSize,
    );
  }
  // 14. Validate delivered_at sorting order (descending)
  if (sortDescendingTest.data.length > 1) {
    const firstDate = sortDescendingTest.data[0].deliveredAt;
    const secondDate = sortDescendingTest.data[1].deliveredAt;
    TestValidator.predicate(
      "delivered_at descending order valid (first >= second)",
      firstDate >= secondDate,
    );
  }
  // 15. Test empty result set with non-matching filter
  const emptyResultTest =
    await api.functional.redditCommunity.member.files.cdn_logs.index(
      fileConnection,
      {
        fileId: file.id,
        body: {
          region: "NONEXISTENT_REGION_12345",
          page: 1,
          per_page: 20,
        } satisfies IRedditCommunityFileCdnLog.IRequest,
      },
    );
  typia.assert(emptyResultTest);
  TestValidator.equals(
    "empty result set has no records",
    emptyResultTest.data.length,
    0,
  );
  // 16. Validate pagination metadata consistency
  TestValidator.predicate(
    "pagination pages calculated correctly",
    paginationTest1.pagination.pages ===
      Math.ceil(
        paginationTest1.pagination.records / paginationTest1.pagination.limit,
      ) ||
      (paginationTest1.pagination.records === 0 &&
        paginationTest1.pagination.pages === 0),
  );
}
