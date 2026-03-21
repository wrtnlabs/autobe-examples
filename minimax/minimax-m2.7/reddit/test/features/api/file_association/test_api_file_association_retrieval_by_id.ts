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
import { generate_random_reddit_clone_member_file_associations_create } from "../../../generate/generate_random_reddit_clone_member_file_associations_create";
import { generate_random_reddit_clone_member_files_create } from "../../../generate/generate_random_reddit_clone_member_files_create";
import { prepare_random_reddit_clone_file } from "../../../prepare/prepare_random_reddit_clone_file";
import { prepare_random_reddit_clone_file_association } from "../../../prepare/prepare_random_reddit_clone_file_association";

export async function test_api_file_association_retrieval_by_id(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new member
  const authorized: IRedditCloneMemberSession.IAuthorized =
    await authorize_member_join(connection, {});
  // 2. Create member-specific connection with authorization
  const memberConnection: api.IConnection = { host: connection.host };
  memberConnection.headers ??= {};
  memberConnection.headers.Authorization = authorized.token.access;
  // 3. Upload a file
  const uploadedFile: IRedditCloneFile =
    await generate_random_reddit_clone_member_files_create(memberConnection, {
      body: {
        target_id: authorized.id,
        target_type: "user",
      },
    });
  typia.assert(uploadedFile);
  // 4. Create a file association
  const fileAssociation: IRedditCloneFileAssociation =
    await generate_random_reddit_clone_member_file_associations_create(
      memberConnection,
      {
        body: {
          redditCloneFileId: uploadedFile.id,
          targetId: authorized.id,
          targetType: "user",
        },
      },
    );
  typia.assert(fileAssociation);
  // 5. Retrieve the file association by ID
  const retrievedAssociation: IRedditCloneFileAssociation =
    await api.functional.redditClone.file_associations.at(memberConnection, {
      associationId: fileAssociation.id,
    });
  typia.assert(retrievedAssociation);
  // 6. Validate the retrieved association matches created data
  TestValidator.equals(
    "association ID matches",
    retrievedAssociation.id,
    fileAssociation.id,
  );
  TestValidator.equals(
    "target_type is user",
    retrievedAssociation.target_type,
    "user",
  );
  TestValidator.equals(
    "target_id matches member id",
    retrievedAssociation.target_id,
    authorized.id,
  );
  TestValidator.equals(
    "file id matches uploaded file",
    retrievedAssociation.file.id,
    uploadedFile.id,
  );
  TestValidator.equals(
    "file originalFilename preserved",
    retrievedAssociation.file.originalFilename,
    uploadedFile.originalFilename,
  );
  TestValidator.equals(
    "file mimeType preserved",
    retrievedAssociation.file.mimeType,
    uploadedFile.mimeType,
  );
  TestValidator.equals(
    "file fileSize preserved",
    retrievedAssociation.file.fileSize,
    uploadedFile.fileSize,
  );
  TestValidator.equals(
    "file status preserved",
    retrievedAssociation.file.status,
    uploadedFile.status,
  );
  TestValidator.equals(
    "uploader id matches",
    retrievedAssociation.file.uploader.id,
    authorized.id,
  );
}
