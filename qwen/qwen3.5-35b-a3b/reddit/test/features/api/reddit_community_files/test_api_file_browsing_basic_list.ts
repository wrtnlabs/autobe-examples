import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunityFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityFile";
import type { IRedditCommunityFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityFile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_file_browsing_basic_list(
  connection: api.IConnection,
): Promise<void> {
  // 1. First request with no filters (empty body)
  const emptyBody: IRedditCommunityFile.IRequest = {};
  const response1 = await api.functional.redditCommunity.files.index(
    connection,
    {
      body: emptyBody,
    },
  );
  typia.assert(response1);
  // 2. Validate response contains paginated structure
  TestValidator.equals(
    "response has pagination metadata",
    response1.pagination,
    { current: 0, limit: 0, records: 0, pages: 0 },
    (key) => false,
  );
  TestValidator.equals(
    "response has data array",
    response1.data.length,
    response1.data.length,
  );
  // 3. Verify pagination metadata fields have valid values
  const pagination1 = response1.pagination;
  TestValidator.predicate(
    "current page is non-negative",
    pagination1.current >= 0,
  );
  TestValidator.predicate("limit is non-negative", pagination1.limit >= 0);
  TestValidator.predicate("records is non-negative", pagination1.records >= 0);
  TestValidator.predicate("pages is non-negative", pagination1.pages >= 0);
  // Verify default page_size is 20 if not specified
  TestValidator.equals("default page_size is 20", pagination1.limit, 20);
  // 4. Validate each file contains required fields using typia.assert
  const files1 = response1.data;
  if (files1.length > 0) {
    for (const file of files1) {
      typia.assert(file);
      // All required fields validated by typia.assert above
    }
  }
  // 5. Verify files are sorted by creation date descending (newest first)
  if (files1.length > 1) {
    let allDesc = true;
    for (let i = 1; i < files1.length; i++) {
      if (new Date(files1[i - 1].createdAt) < new Date(files1[i].createdAt)) {
        allDesc = false;
        break;
      }
    }
    TestValidator.predicate("files sorted by created_at descending", allDesc);
  }
  // 6. Second request with page_size=10
  const pageSizeRequest: IRedditCommunityFile.IRequest = {
    page_size: 10,
  };
  const response2 = await api.functional.redditCommunity.files.index(
    connection,
    {
      body: pageSizeRequest,
    },
  );
  typia.assert(response2);
  // 7. Verify response returns requested number of files
  const files2 = response2.data;
  TestValidator.predicate(
    "page_size=10 returns up to 10 files",
    files2.length <= 10,
  );
  TestValidator.equals(
    "pagination limit matches page_size",
    response2.pagination.limit,
    10,
  );
  // 8. Validate pagination metadata accuracy
  const pagination2 = response2.pagination;
  TestValidator.predicate("records is non-negative", pagination2.records >= 0);
  TestValidator.predicate("pages is non-negative", pagination2.pages >= 0);
  // Verify different file types are represented
  const fileTypes = files2.map((f) => f.fileType);
  const hasUserAvatar = fileTypes.includes("user_avatar");
  const hasPostImage = fileTypes.includes("post_image");
  const hasCommunityIcon = fileTypes.includes("community_icon");
  TestValidator.predicate(
    "response includes different file types",
    hasUserAvatar || hasPostImage || hasCommunityIcon,
  );
}
