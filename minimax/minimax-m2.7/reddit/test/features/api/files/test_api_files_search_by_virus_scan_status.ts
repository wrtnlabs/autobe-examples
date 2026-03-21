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

export async function test_api_files_search_by_virus_scan_status(
  connection: api.IConnection,
): Promise<void> {
  // Test file search with status filter to retrieve files by virus scan processing state.
  // Verify that filtering by 'pending' status returns only files awaiting virus scan,
  // 'processed' returns successfully scanned files, and 'failed' returns files with scan errors.
  // Each result should have correct status value matching the filter criteria.
  // E2E TEST CODE HERE
  // Search files with status filter: 'pending'
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
  // Validate pending results - all files should have 'pending' status
  for (const file of pendingResult.data) {
    TestValidator.equals(
      "file status should be pending",
      file.status,
      "pending",
    );
  }
  // Search files with status filter: 'processed'
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
  // Validate processed results - all files should have 'processed' status
  for (const file of processedResult.data) {
    TestValidator.equals(
      "file status should be processed",
      file.status,
      "processed",
    );
  }
  // Search files with status filter: 'failed'
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
  // Validate failed results - all files should have 'failed' status
  for (const file of failedResult.data) {
    TestValidator.equals("file status should be failed", file.status, "failed");
  }
  // Test pagination info is returned correctly for each status filter
  TestValidator.predicate(
    "pending result has pagination",
    pendingResult.pagination !== null,
  );
  TestValidator.predicate(
    "processed result has pagination",
    processedResult.pagination !== null,
  );
  TestValidator.predicate(
    "failed result has pagination",
    failedResult.pagination !== null,
  );
  // Verify pagination structure
  TestValidator.predicate(
    "pagination has current page",
    pendingResult.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination has limit",
    pendingResult.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "pagination has records count",
    pendingResult.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination has pages count",
    pendingResult.pagination.pages >= 0,
  );
}
