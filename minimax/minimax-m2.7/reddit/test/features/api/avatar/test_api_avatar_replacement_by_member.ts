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

export async function test_api_avatar_replacement_by_member(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new member and obtain authentication
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {});
  typia.assert(authorized);
  // 2. Upload first avatar (JPEG format)
  const firstAvatar = await generate_random_reddit_clone_member_avatars_create(
    memberConnection,
    {
      body: {
        imageData: createMinimalJpegBase64(),
        filename: "avatar1.jpg",
      },
    },
  );
  typia.assert(firstAvatar);
  // 3. Verify first avatar response structure
  TestValidator.equals("targetType is user", firstAvatar.targetType, "user");
  TestValidator.predicate("has valid file id", firstAvatar.file.id !== null);
  TestValidator.equals(
    "first mime type is image/jpeg",
    firstAvatar.file.mimeType,
    "image/jpeg",
  );
  // 4. Upload second avatar (PNG format - different from first)
  const secondAvatar = await generate_random_reddit_clone_member_avatars_create(
    memberConnection,
    {
      body: {
        imageData: createMinimalPngBase64(),
        filename: "avatar2.png",
      },
    },
  );
  typia.assert(secondAvatar);
  // 5. Verify the new avatar has different file id (confirms replacement occurred)
  TestValidator.notEquals(
    "file id changed after replacement",
    secondAvatar.file.id,
    firstAvatar.file.id,
  );
  // 6. Verify new file metadata reflects PNG format
  TestValidator.equals(
    "mime type is image/png",
    secondAvatar.file.mimeType,
    "image/png",
  );
  TestValidator.equals(
    "filename updated to avatar2.png",
    secondAvatar.file.originalFilename,
    "avatar2.png",
  );
}
// Minimal 1x1 red JPEG image in base64
function createMinimalJpegBase64(): string {
  return "/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAn/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCwAB//2Q==";
}
// Minimal 1x1 red PNG image in base64
function createMinimalPngBase64(): string {
  return "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg==";
}
