import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityFile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityFile";
import type { ICommunityFileVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityFileVariant";
import type { ICommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_community_member_files_create } from "../../../generate/generate_random_community_member_files_create";
import { prepare_random_community_file } from "../../../prepare/prepare_random_community_file";

export async function test_api_file_retrieval_after_upload(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate as a new member
  const memberConnection: api.IConnection = { host: connection.host };
  const member: ICommunityMember.IAuthorized = await authorize_member_join(
    memberConnection,
    {},
  );
  typia.assert(member);
  // 2. Upload an avatar image
  const uploadedFile: ICommunityFile =
    await generate_random_community_member_files_create(memberConnection, {
      body: {
        file_type: "AVATAR",
      },
    });
  typia.assert(uploadedFile);
  // 3. Retrieve the file using the file ID
  const retrievedFile: ICommunityFile =
    await api.functional.community.member.files.at(memberConnection, {
      fileId: uploadedFile.id,
    });
  typia.assert(retrievedFile);
  // 4. Verify file metadata matches expected values
  TestValidator.equals("file id matches", retrievedFile.id, uploadedFile.id);
  TestValidator.equals(
    "file type is AVATAR",
    retrievedFile.file_type,
    "AVATAR",
  );
  TestValidator.equals(
    "status is TEMPORARY",
    retrievedFile.status,
    "TEMPORARY",
  );
  TestValidator.equals(
    "original name matches",
    retrievedFile.original_name,
    uploadedFile.original_name,
  );
  TestValidator.equals(
    "mime type matches",
    retrievedFile.mime_type,
    uploadedFile.mime_type,
  );
  TestValidator.equals(
    "file size matches",
    retrievedFile.size,
    uploadedFile.size,
  );
  TestValidator.equals(
    "storage path matches",
    retrievedFile.storage_path,
    uploadedFile.storage_path,
  );
  // 5. Verify image dimensions are present (not null for image files)
  TestValidator.predicate(
    "width is present for image",
    retrievedFile.width !== null && retrievedFile.width !== undefined,
  );
  TestValidator.predicate(
    "height is present for image",
    retrievedFile.height !== null && retrievedFile.height !== undefined,
  );
  // 6. Verify member information
  TestValidator.equals("member id matches", retrievedFile.member.id, member.id);
  TestValidator.equals(
    "member username matches",
    retrievedFile.member.username,
    member.username,
  );
  // 7. Verify timestamps and deletion status
  TestValidator.predicate(
    "created_at is valid date-time",
    retrievedFile.created_at !== null && retrievedFile.created_at !== undefined,
  );
  TestValidator.predicate(
    "updated_at is valid date-time",
    retrievedFile.updated_at !== null && retrievedFile.updated_at !== undefined,
  );
  TestValidator.equals("deleted_at is null", retrievedFile.deleted_at, null);
  // 8. Verify variants array exists
  TestValidator.predicate(
    "variants array exists",
    Array.isArray(retrievedFile.variants),
  );
}
