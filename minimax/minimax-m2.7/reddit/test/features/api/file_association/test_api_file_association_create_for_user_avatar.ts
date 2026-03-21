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

export async function test_api_file_association_create_for_user_avatar(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new member account
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {});
  // 2. Upload an image file for avatar
  const fileData = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
  ).toString("base64");
  const file = await api.functional.redditClone.member.files.create(
    memberConnection,
    {
      body: {
        file_data: fileData,
        mime_type: "image/png",
        original_filename: "avatar.png",
        target_id: authorized.id,
        target_type: "user",
      } satisfies IRedditCloneFile.ICreate,
    },
  );
  typia.assert(file);
  // 3. Verify the uploaded file has status 'processed'
  TestValidator.equals("file status is processed", file.status, "processed");
  // 4. Create the file association for user avatar
  const fileAssociation =
    await api.functional.redditClone.member.file_associations.create(
      memberConnection,
      {
        body: {
          redditCloneFileId: file.id,
          targetId: authorized.id,
          targetType: "user",
        } satisfies IRedditCloneFileAssociation.ICreate,
      },
    );
  typia.assert(fileAssociation);
  // 5. Verify the file association response
  TestValidator.equals(
    "target_type is user",
    fileAssociation.target_type,
    "user",
  );
  TestValidator.equals(
    "target_id matches member id",
    fileAssociation.target_id,
    authorized.id,
  );
  TestValidator.equals(
    "file id matches uploaded file",
    fileAssociation.file.id,
    file.id,
  );
  // 6. Verify unique constraint - associating a second file should replace the first
  const secondFileData = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
  ).toString("base64");
  const secondFile = await api.functional.redditClone.member.files.create(
    memberConnection,
    {
      body: {
        file_data: secondFileData,
        mime_type: "image/png",
        original_filename: "avatar_new.png",
        target_id: authorized.id,
        target_type: "user",
      } satisfies IRedditCloneFile.ICreate,
    },
  );
  typia.assert(secondFile);
  // Create new file association - this should work (replacing the old one)
  const newFileAssociation =
    await api.functional.redditClone.member.file_associations.create(
      memberConnection,
      {
        body: {
          redditCloneFileId: secondFile.id,
          targetId: authorized.id,
          targetType: "user",
        } satisfies IRedditCloneFileAssociation.ICreate,
      },
    );
  typia.assert(newFileAssociation);
  // Verify the new association uses the second file
  TestValidator.equals(
    "new file id matches second uploaded file",
    newFileAssociation.file.id,
    secondFile.id,
  );
  TestValidator.equals(
    "target_type remains user",
    newFileAssociation.target_type,
    "user",
  );
  TestValidator.equals(
    "target_id remains member id",
    newFileAssociation.target_id,
    authorized.id,
  );
}
