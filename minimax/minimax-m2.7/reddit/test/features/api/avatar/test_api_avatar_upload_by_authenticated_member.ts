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

export async function test_api_avatar_upload_by_authenticated_member(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new member
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(authorized);
  // 2. Prepare a valid base64 image (1x1 pixel JPEG)
  // Smallest valid JPEG image encoded as base64
  const base64Image =
    "/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAn/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCwAB//2Q==";
  // 3. Upload avatar using the generation utility function
  const avatarResponse =
    await generate_random_reddit_clone_member_avatars_create(memberConnection, {
      body: {
        imageData: base64Image,
        filename: "test-avatar.jpg",
      },
    });
  typia.assert(avatarResponse);
  // 4. Validate response structure
  TestValidator.equals("targetType is user", avatarResponse.targetType, "user");
  TestValidator.equals(
    "targetId matches member profile",
    avatarResponse.targetId,
    authorized.id,
  );
  TestValidator.equals("id is valid UUID", avatarResponse.id !== null, true);
  TestValidator.equals("file exists", avatarResponse.file !== null, true);
  // 5. Validate file metadata
  TestValidator.equals(
    "original filename set",
    avatarResponse.file.originalFilename,
    "test-avatar.jpg",
  );
  TestValidator.equals(
    "mime type is image",
    avatarResponse.file.mimeType.startsWith("image/"),
    true,
  );
  TestValidator.predicate(
    "file size is positive",
    avatarResponse.file.fileSize > 0,
  );
  TestValidator.equals(
    "status is processed",
    avatarResponse.file.status,
    "processed",
  );
  // 6. Validate uploader information
  TestValidator.equals(
    "uploader id matches member",
    avatarResponse.file.uploader.id,
    authorized.id,
  );
  TestValidator.equals(
    "uploader username matches",
    avatarResponse.file.uploader.username,
    authorized.username,
  );
}
