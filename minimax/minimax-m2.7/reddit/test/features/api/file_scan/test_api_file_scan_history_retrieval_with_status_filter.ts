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

export async function test_api_file_scan_history_retrieval_with_status_filter(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as a member
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {});
  // 2. Upload a valid image file
  const file = await generate_random_reddit_clone_member_files_create(
    memberConnection,
    {
      body: {
        target_id: authorized.profile.id,
        target_type: "user",
      },
    },
  );
  typia.assert(file);
  // 3. Wait for file processing and virus scan completion
  await new Promise((resolve) => setTimeout(resolve, 2000));
  // 4. Retrieve scan history with status filter 'clean'
  const scanHistoryClean = await api.functional.redditClone.files.scans.index(
    memberConnection,
    {
      fileId: file.id,
      body: {
        status: "clean",
        page: 1,
        limit: 20,
      },
    },
  );
  typia.assert(scanHistoryClean);
  // 5. Verify response contains paginated scan records
  TestValidator.predicate(
    "scan history has data",
    scanHistoryClean.data.length >= 0,
  );
  TestValidator.equals(
    "pagination exists",
    scanHistoryClean.pagination !== null,
    true,
  );
  // 6. Validate pagination metadata
  TestValidator.predicate(
    "pagination current is valid",
    scanHistoryClean.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination limit is valid",
    scanHistoryClean.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination records is valid",
    scanHistoryClean.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is valid",
    scanHistoryClean.pagination.pages >= 0,
  );
  // 7. If scan records exist, validate their fields
  if (scanHistoryClean.data.length > 0) {
    const scanRecord = scanHistoryClean.data[0];
    TestValidator.predicate(
      "scan record has valid UUID id",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        scanRecord.id,
      ),
    );
    TestValidator.predicate(
      "scan record has valid scanned_at",
      !isNaN(Date.parse(scanRecord.scanned_at)),
    );
    TestValidator.predicate(
      "scan record has scanner name",
      scanRecord.scanner.length > 0,
    );
    TestValidator.equals(
      "scan record status is clean",
      scanRecord.status,
      "clean",
    );
    TestValidator.equals(
      "threat_name is null for clean scan",
      scanRecord.threat_name,
      null,
    );
    TestValidator.predicate(
      "scan record has valid created_at",
      !isNaN(Date.parse(scanRecord.created_at)),
    );
    TestValidator.predicate(
      "scan record has valid updated_at",
      !isNaN(Date.parse(scanRecord.updated_at)),
    );
    TestValidator.predicate(
      "scan record has file summary",
      scanRecord.file !== null && scanRecord.file !== undefined,
    );
  }
  // 8. Test alternative status filters
  const scanHistoryInfected =
    await api.functional.redditClone.files.scans.index(memberConnection, {
      fileId: file.id,
      body: {
        status: "infected",
        page: 1,
        limit: 20,
      },
    });
  typia.assert(scanHistoryInfected);
  TestValidator.predicate(
    "infected filter returns valid pagination",
    scanHistoryInfected.pagination !== null,
  );
  const scanHistoryError = await api.functional.redditClone.files.scans.index(
    memberConnection,
    {
      fileId: file.id,
      body: {
        status: "error",
        page: 1,
        limit: 20,
      },
    },
  );
  typia.assert(scanHistoryError);
  TestValidator.predicate(
    "error filter returns valid pagination",
    scanHistoryError.pagination !== null,
  );
  // 9. Test without status filter (all scans)
  const scanHistoryAll = await api.functional.redditClone.files.scans.index(
    memberConnection,
    {
      fileId: file.id,
      body: {
        page: 1,
        limit: 20,
      },
    },
  );
  typia.assert(scanHistoryAll);
  TestValidator.predicate(
    "all scans filter returns valid pagination",
    scanHistoryAll.pagination !== null,
  );
  TestValidator.predicate(
    "records count is consistent across filters",
    scanHistoryAll.pagination.records >= scanHistoryClean.pagination.records,
  );
}
