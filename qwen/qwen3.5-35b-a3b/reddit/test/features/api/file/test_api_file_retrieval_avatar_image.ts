import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityFile";
import type { IRedditCommunityFileOfCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityFileOfCommunity";
import type { IRedditCommunityFileOfUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityFileOfUser";
import type { IRedditCommunityFileThumbnail } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityFileThumbnail";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUserProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_community_member_files_create } from "../../../generate/generate_random_reddit_community_member_files_create";
import { prepare_random_reddit_community_file } from "../../../prepare/prepare_random_reddit_community_file";

export async function test_api_file_retrieval_avatar_image(
  connection: api.IConnection,
): Promise<void> {
  // 1. Join a member account and extract member ID
  const joinConnection: api.IConnection = { host: connection.host };
  const joinResponse = await authorize_member_join(joinConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(joinResponse);
  // 2. Extract member ID from join response (needed for owner_id)
  // Note: joinResponse contains token but not member ID directly
  // For this test, we'll use a random member ID as owner_id
  const memberId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 2. Upload an avatar file
  const uploadConnection: api.IConnection = { host: connection.host };
  const avatarFile = await generate_random_reddit_community_member_files_create(
    uploadConnection,
    {
      body: {
        file_type: "avatar",
        owner_id: memberId,
        file_uri: typia.random<string & tags.Format<"uri">>(),
      },
    },
  );
  typia.assert(avatarFile);
  // 3. Retrieve the avatar file
  const retrievalConnection: api.IConnection = { host: connection.host };
  const retrievedFile = await api.functional.redditCommunity.files.at(
    retrievalConnection,
    {
      fileId: avatarFile.id,
    },
  );
  typia.assert(retrievedFile);
  // 4. Validate complete file metadata
  TestValidator.equals("file id matches", retrievedFile.id, avatarFile.id);
  TestValidator.equals(
    "file type is user_avatar",
    retrievedFile.fileType,
    "user_avatar",
  );
  TestValidator.equals(
    "original name preserved",
    retrievedFile.originalName,
    avatarFile.originalName,
  );
  TestValidator.equals(
    "file name unique",
    retrievedFile.fileName,
    avatarFile.fileName,
  );
  TestValidator.equals(
    "file path valid",
    retrievedFile.filePath,
    avatarFile.filePath,
  );
  TestValidator.equals(
    "mime type matches",
    retrievedFile.mimeType,
    avatarFile.mimeType,
  );
  TestValidator.equals(
    "file size matches",
    retrievedFile.fileSize,
    avatarFile.fileSize,
  );
  TestValidator.equals(
    "created at matches",
    retrievedFile.createdAt,
    avatarFile.createdAt,
  );
  TestValidator.equals(
    "updated at matches",
    retrievedFile.updatedAt,
    avatarFile.updatedAt,
  );
  // 5. Verify file association relationship in userAvatars
  TestValidator.predicate(
    "userAvatars array includes relationship",
    retrievedFile.userAvatars !== null &&
      retrievedFile.userAvatars !== undefined &&
      retrievedFile.userAvatars.length > 0,
  );
  if (retrievedFile.userAvatars && retrievedFile.userAvatars.length > 0) {
    const relationship = retrievedFile.userAvatars[0];
    typia.assert(relationship);
    // Validate relationship structure
    TestValidator.notEquals(
      "relationship id is not undefined",
      relationship.id,
      undefined,
    );
    TestValidator.notEquals(
      "relationship created_at is not undefined",
      relationship.createdAt,
      undefined,
    );
    TestValidator.notEquals(
      "relationship updated_at is not undefined",
      relationship.updatedAt,
      undefined,
    );
    TestValidator.equals(
      "relationship deleted_at is null",
      relationship.deletedAt,
      null,
    );
    TestValidator.notEquals(
      "relationship file is not null",
      relationship.file,
      null,
    );
    TestValidator.notEquals(
      "relationship member is not null",
      relationship.member,
      null,
    );
    // Validate member summary
    const member = relationship.member;
    TestValidator.notEquals("member id is not undefined", member.id, undefined);
    TestValidator.notEquals(
      "member username is not undefined",
      member.username,
      undefined,
    );
    TestValidator.notEquals(
      "member created_at is not undefined",
      member.created_at,
      undefined,
    );
    // Validate member profile if present
    if (member.profile) {
      TestValidator.notEquals(
        "profile display_name is not undefined",
        member.profile.display_name,
        undefined,
      );
    }
  }
  // 6. Confirm deleted_at is NULL (file is active)
  TestValidator.equals(
    "file deleted_at is null",
    retrievedFile.deletedAt,
    null,
  );
  // 7. Validate no thumbnails are included for avatar files
  TestValidator.equals(
    "no thumbnails for avatar",
    retrievedFile.thumbnails,
    null,
  );
}
