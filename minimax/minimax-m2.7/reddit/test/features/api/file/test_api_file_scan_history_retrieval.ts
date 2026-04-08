import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCloneFileScan } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCloneFileScan";
import type { IRedditCloneFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFile";
import type { IRedditCloneFileAssociation } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFileAssociation";
import type { IRedditCloneFileScan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFileScan";
import type { IRedditCloneFileThumbnail } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFileThumbnail";
import type { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
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

export async function test_api_file_scan_history_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as a new member
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized: IRedditCloneMember.IAuthorized =
    await authorize_member_join(memberConnection, {});
  // 2. Upload an image file
  const file: IRedditCloneFile =
    await generate_random_reddit_clone_member_files_create(
      memberConnection,
      {},
    );
  typia.assert(file);
  // 3. Get the fileId from the upload response
  const fileId: string & tags.Format<"uuid"> = file.id;
  // 4. Retrieve scan history for the uploaded file
  const scanHistory: IPageIRedditCloneFileScan =
    await api.functional.redditClone.files.scans.at(connection, { fileId });
  typia.assert(scanHistory);
  // Validation: Check pagination structure exists
  TestValidator.equals(
    "pagination object exists",
    scanHistory.pagination !== null && scanHistory.pagination !== undefined,
    true,
  );
  // Validation: Check pagination properties
  TestValidator.predicate(
    "pagination has current",
    scanHistory.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination has limit",
    scanHistory.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "pagination has records",
    scanHistory.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination has pages",
    scanHistory.pagination.pages >= 0,
  );
  // Validation: Check data array exists
  TestValidator.equals(
    "data array exists",
    Array.isArray(scanHistory.data),
    true,
  );
  // Validation: If scan records exist, validate structure
  if (scanHistory.data.length > 0) {
    // Check first scan record structure
    const firstScan = scanHistory.data[0];
    TestValidator.predicate(
      "scan has id",
      /^[0-9a-f-]{36}$/i.test(firstScan.id),
    );
    TestValidator.predicate(
      "scan has scannedAt",
      firstScan.scannedAt.length > 0,
    );
    TestValidator.predicate(
      "scan has scanner",
      typeof firstScan.scanner === "string",
    );
    TestValidator.predicate(
      "scan has valid status",
      ["clean", "infected", "error"].includes(firstScan.status),
    );
    TestValidator.predicate(
      "scan has file object",
      firstScan.file !== null && firstScan.file !== undefined,
    );
    // Validate threatName based on status
    if (firstScan.status === "infected") {
      TestValidator.predicate(
        "threatName populated when infected",
        firstScan.threatName !== null && firstScan.threatName !== undefined,
      );
    } else {
      TestValidator.equals(
        "threatName null when not infected",
        firstScan.threatName ?? null,
        null,
      );
    }
    // Check ordering (scannedAt DESC - most recent first)
    if (scanHistory.data.length > 1) {
      for (let i = 0; i < scanHistory.data.length - 1; i++) {
        const current = new Date(scanHistory.data[i].scannedAt).getTime();
        const next = new Date(scanHistory.data[i + 1].scannedAt).getTime();
        TestValidator.predicate(
          `scan record ${i} is before scan record ${i + 1}`,
          current >= next,
        );
      }
    }
  }
}
