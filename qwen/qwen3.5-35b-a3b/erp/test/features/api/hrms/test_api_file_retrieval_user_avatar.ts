import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmsFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsFile";
import type { IHrmsFileUploadRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsFileUploadRequest";
import type { IHrmsMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsMember";
import type { IHrmsOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganization";
import type { IHrmsOrganizationMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganizationMember";
import type { IHrmsOrganizationRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganizationRole";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmsFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmsFile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_file_retrieval_user_avatar(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as a member and join
  const joinConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(joinConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(memberAuth);
  const memberId = memberAuth.id;
  // 2. Get the member's organization
  const memberOrg = memberAuth.organization_memberships.find(
    (m) => m.member.id === memberId,
  );
  TestValidator.predicate("member has organization", memberOrg !== undefined);
  const organizationId = memberOrg!.organization.id;
  // 3. Upload an avatar file using the avatar update endpoint
  const avatarConnection: api.IConnection = { host: connection.host };
  await authorize_member_login(avatarConnection, {
    body: {
      email: memberAuth.email,
      password: "1234",
    },
  });
  const fileInput: IHrmsFileUploadRequest = {
    file: typia.random<string & tags.ContentMediaType<"image/png">>(),
    original_filename: "avatar.png",
    file_type: "image/png",
  };
  const avatarUpdateResult =
    await api.functional.hrms.member.avatar.updateAvatar(avatarConnection, {
      body: fileInput,
    });
  typia.assert(avatarUpdateResult);
  const avatarStoragePath = avatarUpdateResult.avatar_uri!;
  // 4. Retrieve the file by listing files and finding the avatar
  const retrievalConnection: api.IConnection = { host: connection.host };
  await authorize_member_login(retrievalConnection, {
    body: {
      email: memberAuth.email,
      password: "1234",
    },
  });
  const fileList = await api.functional.hrms.member.files.index(
    retrievalConnection,
    {
      body: {
        category: "user_avatar",
        validationStatus: "validated",
        ownerType: "member",
        ownerId: memberId,
      },
    },
  );
  typia.assert(fileList);
  // Find the avatar file from the list
  const avatarFile = fileList.data.find(
    (f) => f.storage_path === avatarStoragePath,
  );
  TestValidator.predicate(
    "avatar file exists in member's file list",
    avatarFile !== undefined,
  );
  const fileId = avatarFile!.id;
  // 5. Retrieve the file metadata by ID
  const fileMetadata = await api.functional.hrms.member.files.at(
    retrievalConnection,
    {
      fileId,
    },
  );
  typia.assert(fileMetadata);
  // 6. Validate the file metadata
  TestValidator.equals(
    "file category is user_avatar",
    fileMetadata.file_category,
    "user_avatar",
  );
  TestValidator.equals(
    "owner type is member",
    fileMetadata.owner_type,
    "member",
  );
  TestValidator.equals(
    "owner_id matches member id",
    fileMetadata.owner_id,
    memberId,
  );
  // Validate owner reference
  typia.assertGuard(fileMetadata.owner);
  TestValidator.equals("owner id matches", fileMetadata.owner!.id, memberId);
  TestValidator.equals(
    "owner email matches",
    fileMetadata.owner!.email,
    memberAuth.email,
  );
  TestValidator.equals(
    "owner display_name matches",
    fileMetadata.owner!.display_name,
    memberAuth.display_name,
  );
  // Validate organization context
  TestValidator.equals(
    "file belongs to member's organization",
    fileMetadata.organization_id,
    organizationId,
  );
  TestValidator.equals(
    "organization in file matches member's organization",
    fileMetadata.organization.id,
    organizationId,
  );
  // Validate MIME type is an image format
  const imageMimeTypes = ["image/png", "image/jpeg", "image/gif"];
  TestValidator.predicate(
    "mime type is image format",
    imageMimeTypes.includes(fileMetadata.mime_type),
  );
  // Validate validation status
  TestValidator.equals(
    "validation status is validated",
    fileMetadata.validation_status,
    "validated",
  );
  // Validate storage path is valid
  TestValidator.predicate(
    "storage path is valid",
    fileMetadata.storage_path.length > 0,
  );
  TestValidator.equals(
    "storage path matches avatar_uri",
    fileMetadata.storage_path,
    avatarStoragePath,
  );
  // Validate file size is valid
  TestValidator.predicate("file size is positive", fileMetadata.file_size > 0);
}
