import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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

export async function test_api_file_retrieval_pending_status_with_scan_history(
  connection: api.IConnection,
): Promise<void> {
  // Create member for file upload test
  const memberConnection: api.IConnection = { host: connection.host };
  const authorizedMember = await authorize_member_join(memberConnection, {});
  // Upload file immediately (should have 'pending' status as virus scan is async)
  const uploadedFile = await generate_random_reddit_clone_member_files_create(
    memberConnection,
    {},
  );
  typia.assert(uploadedFile);
  // Retrieve file immediately before scanning completes
  const retrievedFile = await api.functional.redditClone.files.at(connection, {
    fileId: uploadedFile.id,
  });
  typia.assert(retrievedFile);
  // Validate file status is 'pending' (virus scan in progress)
  TestValidator.equals(
    "file status is pending",
    retrievedFile.status,
    "pending",
  );
  // Validate scan history is empty or partial (no 'clean' result yet)
  TestValidator.predicate(
    "scan history is empty or has no clean result",
    retrievedFile.scans.length === 0 ||
      !retrievedFile.scans.some((s) => s.status === "clean"),
  );
  // Validate uploader information is present
  TestValidator.predicate("uploader info exists", !!retrievedFile.uploader);
  TestValidator.equals(
    "uploader id matches member",
    retrievedFile.uploader.id,
    authorizedMember.id,
  );
  TestValidator.predicate(
    "uploader has username",
    !!retrievedFile.uploader.username,
  );
}