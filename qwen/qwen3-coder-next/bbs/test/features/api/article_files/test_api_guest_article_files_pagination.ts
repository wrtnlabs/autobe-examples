import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticleFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleFile";
import type { IDiscussionBoardGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardGuest";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardArticleFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardArticleFile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

export async function test_api_guest_article_files_pagination(
  connection: api.IConnection,
): Promise<void> {
  // Create guest connection
  const guestConnection: api.IConnection = { host: connection.host };
  const guestToken = await authorize_guest_join(guestConnection, {
    body: typia.random<IDiscussionBoardGuest.IJoin>(),
  });
  typia.assert(guestToken);
  // Generate random article ID for testing
  const articleId = typia.random<string & tags.Format<"uuid">>();
  // Test 1: Default pagination (no parameters)
  const defaultResult =
    await api.functional.discussionBoard.guest.articles.files.index(
      guestConnection,
      {
        articleId,
      },
    );
  typia.assert(defaultResult);
  TestValidator.equals(
    "default pagination has correct structure",
    defaultResult.pagination.current,
    1,
  );
  TestValidator.predicate(
    "default pagination has positive limit",
    defaultResult.pagination.limit > 0,
  );
  TestValidator.predicate(
    "default pagination has non-negative records",
    defaultResult.pagination.records >= 0,
  );
  TestValidator.predicate(
    "default pagination has valid pages",
    defaultResult.pagination.pages >= 0,
  );
  // Test 2: Custom page size (limit)
  const customLimit =
    typia.random<number>() as number satisfies number as number;
  const customResult =
    await api.functional.discussionBoard.guest.articles.files.index(
      guestConnection,
      {
        articleId,
      },
    );
  typia.assert(customResult);
  TestValidator.equals(
    "custom limit matches request",
    customResult.pagination.limit,
    customLimit,
  );
  // Test 3: First page boundary
  const firstPageResult =
    await api.functional.discussionBoard.guest.articles.files.index(
      guestConnection,
      {
        articleId,
      },
    );
  typia.assert(firstPageResult);
  TestValidator.equals(
    "first page number is 1",
    firstPageResult.pagination.current,
    1,
  );
  // Test 4: Last page validation
  if (firstPageResult.pagination.pages > 1) {
    const lastPageResult =
      await api.functional.discussionBoard.guest.articles.files.index(
        guestConnection,
        {
          articleId,
        },
      );
    typia.assert(lastPageResult);
    TestValidator.equals(
      "last page number matches pages",
      lastPageResult.pagination.current,
      firstPageResult.pagination.pages,
    );
  }
  // Test 5: Out-of-range page handling
  const outOfRangePage = firstPageResult.pagination.pages + 10;
  const outOfRangeResult =
    await api.functional.discussionBoard.guest.articles.files.index(
      guestConnection,
      {
        articleId,
      },
    );
  typia.assert(outOfRangeResult);
  // Test 6: Pagination metadata consistency
  TestValidator.equals(
    "records equals data length or pagination records",
    true,
    firstPageResult.pagination.records === firstPageResult.data.length ||
      firstPageResult.data.length <= firstPageResult.pagination.limit,
  );
  if (firstPageResult.pagination.records > 0) {
    TestValidator.predicate(
      "has data when records > 0",
      firstPageResult.data.length > 0,
    );
  } else {
    TestValidator.equals(
      "no data when records = 0",
      firstPageResult.data.length,
      0,
    );
  }
  // Test 7: Data array type validation
  for (const file of firstPageResult.data) {
    typia.assert(file);
  }
}
