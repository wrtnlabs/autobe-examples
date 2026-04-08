import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCloneFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFile";
import type { IRedditCloneFileAssociation } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFileAssociation";
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
import { generate_random_reddit_clone_member_avatars_create } from "../../../generate/generate_random_reddit_clone_member_avatars_create";
import { prepare_random_reddit_clone_file_association } from "../../../prepare/prepare_random_reddit_clone_file_association";

export async function test_api_member_profile_update_avatar(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as a member by registering
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {});
  typia.assert(authorized);
  // 2. Upload avatar image to get file association ID
  const avatarResponse =
    await generate_random_reddit_clone_member_avatars_create(
      memberConnection,
      {},
    );
  typia.assert(avatarResponse);
  // 3. Call PATCH /redditClone/members with the avatar file association ID
  const updatedMember = await api.functional.redditClone.members.update(
    memberConnection,
    {
      body: {
        avatarFileAssociationId: avatarResponse.id,
      } satisfies IRedditCloneMember.IUpdate,
    },
  );
  typia.assert(updatedMember);
  // 4. Validate member profile structure
  TestValidator.equals("member id matches", updatedMember.id, authorized.id);
  TestValidator.equals(
    "username matches",
    updatedMember.username,
    authorized.username,
  );
  TestValidator.equals(
    "display name matches",
    updatedMember.displayName,
    authorized.displayName,
  );
  TestValidator.predicate(
    "has karma score",
    updatedMember.karmaScore !== undefined,
  );
  // 5. Validate avatar field with IRedditCloneFileAssociation.ISummary structure
  TestValidator.predicate(
    "avatar is set",
    updatedMember.avatar !== null && updatedMember.avatar !== undefined,
  );
  const avatar = updatedMember.avatar!;
  // Validate ISummary properties: id, userId, file, createdAt
  TestValidator.equals(
    "avatar id matches response",
    avatar.id,
    avatarResponse.id,
  );
  TestValidator.equals(
    "avatar userId matches member",
    avatar.userId,
    authorized.id,
  );
  TestValidator.predicate(
    "avatar has createdAt",
    avatar.createdAt !== undefined,
  );
  // 6. Validate nested file object (IRedditCloneFile.ISummary)
  const file = avatar.file;
  TestValidator.predicate("file exists", file !== undefined && file !== null);
  TestValidator.equals("file id present", file!.id !== undefined, true);
  TestValidator.equals(
    "original filename present",
    file!.originalFilename !== undefined,
    true,
  );
  TestValidator.equals("mime type present", file!.mimeType !== undefined, true);
  TestValidator.equals("file size present", file!.fileSize !== undefined, true);
  TestValidator.equals("status present", file!.status !== undefined, true);
  TestValidator.equals(
    "uploader summary present",
    file!.uploader !== undefined,
    true,
  );
  // Validate uploader summary (IRedditCloneMember.ISummary)
  const uploader = file!.uploader;
  TestValidator.equals(
    "uploader id matches member",
    uploader.id,
    authorized.id,
  );
  TestValidator.equals(
    "uploader username matches",
    uploader.username,
    authorized.username,
  );
}
