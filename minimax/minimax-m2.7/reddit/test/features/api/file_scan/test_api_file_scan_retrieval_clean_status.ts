import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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

export async function test_api_file_scan_retrieval_clean_status(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member and authenticate
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {});
  typia.assert(authorized);
  // 2. Upload a file to trigger virus scanning
  const file = await generate_random_reddit_clone_member_files_create(
    memberConnection,
    {},
  );
  typia.assert(file);
  // 3. Verify file was uploaded with scans
  TestValidator.equals("file has scans", file.scans.length > 0, true);
  // 4. Get the first scan from the file
  const scanRecord = file.scans[0];
  const fileId = file.id;
  const scanId = scanRecord.id;
  // 5. Retrieve the specific scan record
  const scan = await api.functional.redditClone.files.scans.at(
    memberConnection,
    {
      fileId: fileId,
      scanId: scanId,
    },
  );
  typia.assert(scan);
  // 6. Validate scan record details
  TestValidator.equals("scan ID matches requested scanId", scan.id, scanId);
  TestValidator.equals("file ID matches", scan.file.id, fileId);
  TestValidator.equals("scanner name present", scan.scanner.length > 0, true);
  TestValidator.equals("status is clean", scan.status, "clean");
  TestValidator.equals("threat_name is null", scan.threat_name, null);
  TestValidator.equals("details is null", scan.details, null);
  TestValidator.equals("scanned_at is valid", scan.scanned_at.length > 0, true);
  TestValidator.equals("created_at is valid", scan.created_at.length > 0, true);
  TestValidator.equals("updated_at is valid", scan.updated_at.length > 0, true);
  // 7. Validate nested file object in scan response
  TestValidator.equals(
    "file originalFilename matches",
    scan.file.originalFilename,
    file.originalFilename,
  );
  TestValidator.equals(
    "file mimeType matches",
    scan.file.mimeType,
    file.mimeType,
  );
  TestValidator.equals(
    "file fileSize matches",
    scan.file.fileSize,
    file.fileSize,
  );
  TestValidator.equals("file status matches", scan.file.status, file.status);
}
