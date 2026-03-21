import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCloneFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCloneFile";
import type { IRedditCloneFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFile";
import type { IRedditCloneFileAssociation } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFileAssociation";
import type { IRedditCloneMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMemberSession";
import type { IRedditCloneUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneUserProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_files_search_with_pagination_and_sorting(
  connection: api.IConnection,
): Promise<void> {
  // Test 1: Default search (no filters) - should return paginated results
  const defaultResponse = await api.functional.redditClone.files.index(
    connection,
    {
      body: {} satisfies IRedditCloneFile.IRequest,
    },
  );
  typia.assert(defaultResponse);
  // Validate pagination object structure
  TestValidator.equals(
    "pagination current is valid",
    defaultResponse.pagination.current >= 0,
    true,
  );
  TestValidator.equals(
    "pagination limit is valid",
    defaultResponse.pagination.limit >= 0,
    true,
  );
  TestValidator.equals(
    "pagination records is valid",
    defaultResponse.pagination.records >= 0,
    true,
  );
  TestValidator.equals(
    "pagination pages is valid",
    defaultResponse.pagination.pages >= 0,
    true,
  );
  // Test 2: Validate file summary structure for each file
  for (const file of defaultResponse.data) {
    // Validate required fields exist
    TestValidator.predicate("file has id", file.id !== undefined);
    TestValidator.predicate(
      "file has originalFilename",
      file.originalFilename !== undefined,
    );
    TestValidator.predicate("file has mimeType", file.mimeType !== undefined);
    TestValidator.predicate("file has fileSize", file.fileSize !== undefined);
    TestValidator.predicate("file has status", file.status !== undefined);
    TestValidator.predicate("file has createdAt", file.createdAt !== undefined);
    TestValidator.predicate("file has uploader", file.uploader !== undefined);
    // Validate uploader structure
    TestValidator.predicate("uploader has id", file.uploader.id !== undefined);
    TestValidator.predicate(
      "uploader has username",
      file.uploader.username !== undefined,
    );
    TestValidator.predicate(
      "uploader has profile",
      file.uploader.profile !== undefined,
    );
    // Validate status is one of allowed values
    const validStatuses = ["pending", "processed", "failed"];
    TestValidator.predicate(
      "status is valid value",
      validStatuses.includes(file.status),
    );
  }
  // Test 3: Pagination with page 1 and limit 5
  const paginatedResponse = await api.functional.redditClone.files.index(
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
  typia.assert(paginatedResponse);
  TestValidator.equals(
    "pagination limit matches request",
    paginatedResponse.pagination.limit,
    5,
  );
  TestValidator.equals(
    "pagination current is 1",
    paginatedResponse.pagination.current,
    1,
  );
  TestValidator.predicate(
    "records count is non-negative",
    paginatedResponse.pagination.records >= 0,
  );
  TestValidator.predicate(
    "data length does not exceed limit",
    paginatedResponse.data.length <= 5,
  );
  // Test 4: Pagination with page 2
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
  TestValidator.equals(
    "page 2 pagination current is 2",
    page2Response.pagination.current,
    2,
  );
  // Test 5: Sort by createdAt descending (default)
  const descResponse = await api.functional.redditClone.files.index(
    connection,
    {
      body: {
        sort: "createdAt" as const,
        order: "desc" as const,
        limit: 10 satisfies number &
          tags.Type<"int32"> &
          tags.Minimum<1> &
          tags.Maximum<100>,
      } satisfies IRedditCloneFile.IRequest,
    },
  );
  typia.assert(descResponse);
  // Validate descending order of createdAt
  if (descResponse.data.length > 1) {
    for (let i = 0; i < descResponse.data.length - 1; i++) {
      const current = new Date(descResponse.data[i].createdAt).getTime();
      const next = new Date(descResponse.data[i + 1].createdAt).getTime();
      TestValidator.predicate(
        `file ${i} createdAt >= file ${i + 1} createdAt (desc order)`,
        current >= next,
      );
    }
  }
  // Test 6: Sort by createdAt ascending
  const ascResponse = await api.functional.redditClone.files.index(connection, {
    body: {
      sort: "createdAt" as const,
      order: "asc" as const,
      limit: 10 satisfies number &
        tags.Type<"int32"> &
        tags.Minimum<1> &
        tags.Maximum<100>,
    } satisfies IRedditCloneFile.IRequest,
  });
  typia.assert(ascResponse);
  // Validate ascending order of createdAt
  if (ascResponse.data.length > 1) {
    for (let i = 0; i < ascResponse.data.length - 1; i++) {
      const current = new Date(ascResponse.data[i].createdAt).getTime();
      const next = new Date(ascResponse.data[i + 1].createdAt).getTime();
      TestValidator.predicate(
        `file ${i} createdAt <= file ${i + 1} createdAt (asc order)`,
        current <= next,
      );
    }
  }
  // Test 7: Sort by originalFilename
  const filenameSortResponse = await api.functional.redditClone.files.index(
    connection,
    {
      body: {
        sort: "originalFilename" as const,
        order: "asc" as const,
        limit: 10 satisfies number &
          tags.Type<"int32"> &
          tags.Minimum<1> &
          tags.Maximum<100>,
      } satisfies IRedditCloneFile.IRequest,
    },
  );
  typia.assert(filenameSortResponse);
  // Test 8: Sort by fileSize
  const fileSizeSortResponse = await api.functional.redditClone.files.index(
    connection,
    {
      body: {
        sort: "fileSize" as const,
        order: "desc" as const,
        limit: 10 satisfies number &
          tags.Type<"int32"> &
          tags.Minimum<1> &
          tags.Maximum<100>,
      } satisfies IRedditCloneFile.IRequest,
    },
  );
  typia.assert(fileSizeSortResponse);
  // Validate descending order of fileSize
  if (fileSizeSortResponse.data.length > 1) {
    for (let i = 0; i < fileSizeSortResponse.data.length - 1; i++) {
      TestValidator.predicate(
        `file ${i} fileSize >= file ${i + 1} fileSize (desc order)`,
        fileSizeSortResponse.data[i].fileSize >=
          fileSizeSortResponse.data[i + 1].fileSize,
      );
    }
  }
  // Test 9: Sort by mimeType
  const mimeTypeSortResponse = await api.functional.redditClone.files.index(
    connection,
    {
      body: {
        sort: "mimeType" as const,
        order: "asc" as const,
        limit: 10 satisfies number &
          tags.Type<"int32"> &
          tags.Minimum<1> &
          tags.Maximum<100>,
      } satisfies IRedditCloneFile.IRequest,
    },
  );
  typia.assert(mimeTypeSortResponse);
  // Test 10: Sort by status
  const statusSortResponse = await api.functional.redditClone.files.index(
    connection,
    {
      body: {
        sort: "status" as const,
        order: "asc" as const,
        limit: 10 satisfies number &
          tags.Type<"int32"> &
          tags.Minimum<1> &
          tags.Maximum<100>,
      } satisfies IRedditCloneFile.IRequest,
    },
  );
  typia.assert(statusSortResponse);
  // Test 11: Filter by status
  const statusFilterResponse = await api.functional.redditClone.files.index(
    connection,
    {
      body: {
        status: "processed" as const,
        limit: 10 satisfies number &
          tags.Type<"int32"> &
          tags.Minimum<1> &
          tags.Maximum<100>,
      } satisfies IRedditCloneFile.IRequest,
    },
  );
  typia.assert(statusFilterResponse);
  // All returned files should have processed status
  for (const file of statusFilterResponse.data) {
    TestValidator.equals("file status is processed", file.status, "processed");
  }
  // Test 12: Combined pagination and sorting
  const combinedResponse = await api.functional.redditClone.files.index(
    connection,
    {
      body: {
        page: 1 satisfies number & tags.Type<"int32"> & tags.Minimum<1>,
        limit: 3 satisfies number &
          tags.Type<"int32"> &
          tags.Minimum<1> &
          tags.Maximum<100>,
        sort: "createdAt" as const,
        order: "desc" as const,
      } satisfies IRedditCloneFile.IRequest,
    },
  );
  typia.assert(combinedResponse);
  TestValidator.equals(
    "combined limit is 3",
    combinedResponse.pagination.limit,
    3,
  );
  TestValidator.equals(
    "combined current is 1",
    combinedResponse.pagination.current,
    1,
  );
  TestValidator.predicate(
    "combined data length does not exceed 3",
    combinedResponse.data.length <= 3,
  );
  // Test 13: Verify pages calculation
  if (combinedResponse.pagination.records > 0) {
    const expectedPages = Math.ceil(
      combinedResponse.pagination.records / combinedResponse.pagination.limit,
    );
    TestValidator.equals(
      "pages calculation is correct",
      combinedResponse.pagination.pages,
      expectedPages,
    );
  }
  // Test 14: Maximum limit boundary
  const maxLimitResponse = await api.functional.redditClone.files.index(
    connection,
    {
      body: {
        limit: 100 satisfies number &
          tags.Type<"int32"> &
          tags.Minimum<1> &
          tags.Maximum<100>,
      } satisfies IRedditCloneFile.IRequest,
    },
  );
  typia.assert(maxLimitResponse);
  TestValidator.equals(
    "max limit is respected",
    maxLimitResponse.pagination.limit,
    100,
  );
}
