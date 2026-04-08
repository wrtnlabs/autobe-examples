import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCloneFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCloneFile";
import type { IRedditCloneFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFile";
import type { IRedditCloneFileThumbnail } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFileThumbnail";
import type { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_files_pagination_listing(
  connection: api.IConnection,
): Promise<void> {
  // 1. Test default pagination request (no filters)
  const defaultResponse = await api.functional.redditClone.files.index(
    connection,
    {
      body: {} satisfies IRedditCloneFile.IRequest,
    },
  );
  typia.assert(defaultResponse);
  // Validate pagination metadata
  const pagination = defaultResponse.pagination;
  TestValidator.predicate("current page is valid", pagination.current >= 1);
  TestValidator.predicate("limit is valid", pagination.limit >= 1);
  TestValidator.predicate("records is valid", pagination.records >= 0);
  TestValidator.predicate("pages is valid", pagination.pages >= 0);
  // Validate pages calculation
  if (pagination.records > 0) {
    TestValidator.equals(
      "pages calculation is correct",
      pagination.pages,
      Math.ceil(pagination.records / pagination.limit),
    );
  }
  // 2. Validate file summary structure for each item
  for (const file of defaultResponse.data) {
    typia.assert(file);
    TestValidator.predicate(
      "file id is valid uuid",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        file.id,
      ),
    );
    TestValidator.predicate("fileSize is non-negative", file.fileSize >= 0);
    TestValidator.predicate(
      "uploader id is valid uuid",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        file.uploader.id,
      ),
    );
    TestValidator.predicate(
      "createdAt is valid date",
      !isNaN(Date.parse(file.createdAt)),
    );
  }
  // 3. Test pagination with page=1, limit=5
  const page1Response = await api.functional.redditClone.files.index(
    connection,
    {
      body: {
        page: 1 satisfies number & tags.Type<"int32"> & tags.Minimum<1>,
        limit: 5 satisfies number &
          tags.Type<"int32"> &
          tags.Minimum<1> &
          tags.Maximum<100>,
      } satisfies IRedditCloneFile.IRequest,
    },
  );
  typia.assert(page1Response);
  TestValidator.equals("page 1 current", page1Response.pagination.current, 1);
  TestValidator.equals("page 1 limit", page1Response.pagination.limit, 5);
  // 4. Test pagination with page=2, limit=5
  const page2Response = await api.functional.redditClone.files.index(
    connection,
    {
      body: {
        page: 2 satisfies number & tags.Type<"int32"> & tags.Minimum<1>,
        limit: 5 satisfies number &
          tags.Type<"int32"> &
          tags.Minimum<1> &
          tags.Maximum<100>,
      } satisfies IRedditCloneFile.IRequest,
    },
  );
  typia.assert(page2Response);
  TestValidator.equals("page 2 current", page2Response.pagination.current, 2);
  TestValidator.equals("page 2 limit", page2Response.pagination.limit, 5);
  // Verify both pages have same limit
  TestValidator.equals(
    "limit consistent across pages",
    page2Response.pagination.limit,
    page1Response.pagination.limit,
  );
  // 5. Verify sorting by created_at descending
  if (defaultResponse.data.length > 1) {
    for (let i = 0; i < defaultResponse.data.length - 1; i++) {
      const current = new Date(defaultResponse.data[i].createdAt).getTime();
      const next = new Date(defaultResponse.data[i + 1].createdAt).getTime();
      TestValidator.predicate(
        `file ${i} createdAt >= file ${i + 1} createdAt`,
        current >= next,
      );
    }
  }
  // 6. Test with limit=1 to verify pagination works with small pages
  const singleItemResponse = await api.functional.redditClone.files.index(
    connection,
    {
      body: {
        limit: 1 satisfies number &
          tags.Type<"int32"> &
          tags.Minimum<1> &
          tags.Maximum<100>,
      } satisfies IRedditCloneFile.IRequest,
    },
  );
  typia.assert(singleItemResponse);
  TestValidator.equals(
    "single item limit",
    singleItemResponse.pagination.limit,
    1,
  );
  TestValidator.predicate(
    "data length <= 1",
    singleItemResponse.data.length <= 1,
  );
}
