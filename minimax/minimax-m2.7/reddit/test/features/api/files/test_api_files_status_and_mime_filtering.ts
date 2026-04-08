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

export async function test_api_files_status_and_mime_filtering(
  connection: api.IConnection,
): Promise<void> {
  // Test 1: Filter by status='pending' returns only pending files
  const pendingResult = await api.functional.redditClone.files.index(
    connection,
    {
      body: {
        status: "pending",
        limit: 10,
      } satisfies IRedditCloneFile.IRequest,
    },
  );
  typia.assert(pendingResult);
  // Validate pagination structure
  TestValidator.equals(
    "pending pagination limit",
    pendingResult.pagination.limit,
    10,
  );
  TestValidator.predicate(
    "pending records is non-negative",
    pendingResult.pagination.records >= 0,
  );
  // Validate all returned files have pending status
  for (const file of pendingResult.data) {
    TestValidator.equals("file status is pending", file.status, "pending");
  }
  // Test 2: Filter by status='processed' returns only processed files
  const processedResult = await api.functional.redditClone.files.index(
    connection,
    {
      body: {
        status: "processed",
        limit: 10,
      } satisfies IRedditCloneFile.IRequest,
    },
  );
  typia.assert(processedResult);
  TestValidator.equals(
    "processed pagination limit",
    processedResult.pagination.limit,
    10,
  );
  for (const file of processedResult.data) {
    TestValidator.equals("file status is processed", file.status, "processed");
  }
  // Test 3: Filter by status='failed' returns only failed files
  const failedResult = await api.functional.redditClone.files.index(
    connection,
    {
      body: {
        status: "failed",
        limit: 10,
      } satisfies IRedditCloneFile.IRequest,
    },
  );
  typia.assert(failedResult);
  TestValidator.equals(
    "failed pagination limit",
    failedResult.pagination.limit,
    10,
  );
  for (const file of failedResult.data) {
    TestValidator.equals("file status is failed", file.status, "failed");
  }
  // Test 4: Filter by mimeType='image/jpeg'
  const jpegResult = await api.functional.redditClone.files.index(connection, {
    body: {
      mimeType: "image/jpeg",
      limit: 10,
    } satisfies IRedditCloneFile.IRequest,
  });
  typia.assert(jpegResult);
  TestValidator.equals(
    "jpeg pagination limit",
    jpegResult.pagination.limit,
    10,
  );
  for (const file of jpegResult.data) {
    TestValidator.equals(
      "file mimeType is image/jpeg",
      file.mimeType,
      "image/jpeg",
    );
  }
  // Test 5: Filter by mimeType='image/png'
  const pngResult = await api.functional.redditClone.files.index(connection, {
    body: {
      mimeType: "image/png",
      limit: 10,
    } satisfies IRedditCloneFile.IRequest,
  });
  typia.assert(pngResult);
  TestValidator.equals("png pagination limit", pngResult.pagination.limit, 10);
  for (const file of pngResult.data) {
    TestValidator.equals(
      "file mimeType is image/png",
      file.mimeType,
      "image/png",
    );
  }
  // Test 6: Combine status AND mimeType filters
  const combinedResult = await api.functional.redditClone.files.index(
    connection,
    {
      body: {
        status: "processed",
        mimeType: "image/jpeg",
        limit: 10,
      } satisfies IRedditCloneFile.IRequest,
    },
  );
  typia.assert(combinedResult);
  TestValidator.equals(
    "combined pagination limit",
    combinedResult.pagination.limit,
    10,
  );
  for (const file of combinedResult.data) {
    TestValidator.equals(
      "combined status is processed",
      file.status,
      "processed",
    );
    TestValidator.equals(
      "combined mimeType is image/jpeg",
      file.mimeType,
      "image/jpeg",
    );
  }
  // Test 7: Filter with impossible criteria returns empty data with valid pagination
  const emptyResult = await api.functional.redditClone.files.index(connection, {
    body: {
      status: "pending",
      mimeType: "application/pdf",
      limit: 10,
    } satisfies IRedditCloneFile.IRequest,
  });
  typia.assert(emptyResult);
  // Validate empty results have proper pagination
  TestValidator.equals(
    "empty pagination limit",
    emptyResult.pagination.limit,
    10,
  );
  TestValidator.equals(
    "empty pagination current",
    emptyResult.pagination.current,
    1,
  );
  TestValidator.equals(
    "empty pagination records",
    emptyResult.pagination.records,
    0,
  );
  TestValidator.equals(
    "empty pagination pages",
    emptyResult.pagination.pages,
    0,
  );
  TestValidator.equals("empty data array", emptyResult.data.length, 0);
  // Test 8: Pagination with different page sizes
  const paginatedResult = await api.functional.redditClone.files.index(
    connection,
    {
      body: {
        limit: 5,
      } satisfies IRedditCloneFile.IRequest,
    },
  );
  typia.assert(paginatedResult);
  TestValidator.equals("paginated limit", paginatedResult.pagination.limit, 5);
  TestValidator.predicate(
    "data length <= limit",
    paginatedResult.data.length <= 5,
  );
}
