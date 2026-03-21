import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCloneFileScan } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCloneFileScan";
import type { IRedditCloneCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunityBan";
import type { IRedditCloneFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFile";
import type { IRedditCloneFileAssociation } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFileAssociation";
import type { IRedditCloneFileScan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFileScan";
import type { IRedditCloneFileThumbnail } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFileThumbnail";
import type { IRedditCloneMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMemberSession";
import type { IRedditCloneUserKarma } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneUserKarma";
import type { IRedditCloneUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneUserProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_clone_member_files_create } from "../../../generate/generate_random_reddit_clone_member_files_create";
import { prepare_random_reddit_clone_file } from "../../../prepare/prepare_random_reddit_clone_file";

export async function test_api_file_scan_history_date_range_and_scanner_filter(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as a member
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {});
  typia.assert(authorized);
  // 2. Upload a valid image file that triggers virus scanning
  const file = await generate_random_reddit_clone_member_files_create(
    memberConnection,
    {
      body: {
        target_id: authorized.id,
        target_type: "user",
      },
    },
  );
  typia.assert(file);
  // 3. Wait for processing completion (file scanning)
  await new Promise((resolve) => setTimeout(resolve, 2000));
  // 4. Retrieve scan history to get available scanners
  const initialScans = await api.functional.redditClone.files.scans.index(
    memberConnection,
    {
      fileId: file.id,
      body: {},
    },
  );
  typia.assert(initialScans);
  // Get a scanner name from existing scans if available
  const scannerName =
    initialScans.data.length > 0 ? initialScans.data[0].scanner : "ClamAV";
  // 5. Filter by specific scanner name and verify
  const scannerFiltered = await api.functional.redditClone.files.scans.index(
    memberConnection,
    {
      fileId: file.id,
      body: {
        scanner: scannerName,
      } satisfies IRedditCloneFileScan.IRequest,
    },
  );
  typia.assert(scannerFiltered);
  // Verify all records are from the specified scanner
  for (const scan of scannerFiltered.data) {
    TestValidator.equals("scanner matches filter", scan.scanner, scannerName);
  }
  // 6. Test date range filtering with scanned_from and scanned_to
  const now = new Date();
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const oneDayAhead = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const dateRangeFiltered = await api.functional.redditClone.files.scans.index(
    memberConnection,
    {
      fileId: file.id,
      body: {
        scanned_from: oneDayAgo.toISOString(),
        scanned_to: oneDayAhead.toISOString(),
      } satisfies IRedditCloneFileScan.IRequest,
    },
  );
  typia.assert(dateRangeFiltered);
  // 7. Verify records fall within the specified date range
  for (const scan of dateRangeFiltered.data) {
    const scanDate = new Date(scan.scanned_at);
    TestValidator.predicate(
      "scan date within range",
      scanDate >= oneDayAgo && scanDate <= oneDayAhead,
    );
  }
  // 8. Test combining multiple filters: scanner name + status + date range
  const combinedFiltered = await api.functional.redditClone.files.scans.index(
    memberConnection,
    {
      fileId: file.id,
      body: {
        scanner: scannerName,
        status: "clean",
        scanned_from: oneDayAgo.toISOString(),
        scanned_to: oneDayAhead.toISOString(),
      } satisfies IRedditCloneFileScan.IRequest,
    },
  );
  typia.assert(combinedFiltered);
  // 9. Verify combined filters narrow results correctly
  for (const scan of combinedFiltered.data) {
    TestValidator.equals("scanner matches", scan.scanner, scannerName);
    TestValidator.equals("status is clean", scan.status, "clean");
    const scanDate = new Date(scan.scanned_at);
    TestValidator.predicate(
      "date within range",
      scanDate >= oneDayAgo && scanDate <= oneDayAhead,
    );
  }
  // 10. Validate pagination with filters
  const paginatedFiltered = await api.functional.redditClone.files.scans.index(
    memberConnection,
    {
      fileId: file.id,
      body: {
        page: 1,
        limit: 10,
      } satisfies IRedditCloneFileScan.IRequest,
    },
  );
  typia.assert(paginatedFiltered);
  TestValidator.predicate(
    "has pagination info",
    paginatedFiltered.pagination !== undefined,
  );
  TestValidator.predicate(
    "records >= 0",
    paginatedFiltered.pagination.records >= 0,
  );
  TestValidator.predicate(
    "current page is valid",
    paginatedFiltered.pagination.current >= 1,
  );
  TestValidator.predicate(
    "limit is valid",
    paginatedFiltered.pagination.limit > 0,
  );
}
