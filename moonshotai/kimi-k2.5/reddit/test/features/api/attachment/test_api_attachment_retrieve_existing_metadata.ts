import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditLikeAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeAttachment";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_like_member_attachments_create } from "../../../generate/generate_random_reddit_like_member_attachments_create";
import { prepare_random_reddit_like_attachment } from "../../../prepare/prepare_random_reddit_like_attachment";

export async function test_api_attachment_retrieve_existing_metadata(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Authenticate as a member
  const memberConnection: api.IConnection = { host: connection.host };
  const authorizedMember = await authorize_member_join(memberConnection, {});
  // Step 2: Upload a valid image file to create the attachment
  const attachment =
    await generate_random_reddit_like_member_attachments_create(
      memberConnection,
      {},
    );
  // Step 3: Retrieve attachment metadata using guest connection (unauthenticated access)
  const guestConnection: api.IConnection = { host: connection.host };
  const retrieved = await api.functional.redditLike.attachments.at(
    guestConnection,
    {
      attachmentId: attachment.id,
    },
  );
  // Step 4: Validate complete response structure using typia
  typia.assert(retrieved);
  // Step 5: Validate uploader summary matches the creating member
  TestValidator.equals(
    "uploader id matches member",
    retrieved.uploader.id,
    authorizedMember.id,
  );
  TestValidator.equals(
    "uploader email matches",
    retrieved.uploader.email,
    authorizedMember.email,
  );
  TestValidator.equals(
    "uploader username matches",
    retrieved.uploader.username,
    authorizedMember.username,
  );
  TestValidator.equals(
    "uploader emailVerified matches",
    retrieved.uploader.emailVerified,
    authorizedMember.emailVerified,
  );
  // Step 6: Validate attachment metadata consistency
  TestValidator.equals("attachment id consistent", retrieved.id, attachment.id);
  TestValidator.equals(
    "storage path matches",
    retrieved.storagePath,
    attachment.storagePath,
  );
  TestValidator.equals(
    "original filename matches",
    retrieved.originalFilename,
    attachment.originalFilename,
  );
  TestValidator.predicate(
    "mime type starts with image/",
    retrieved.mimeType.startsWith("image/"),
  );
  TestValidator.equals(
    "file size bytes matches",
    retrieved.fileSizeBytes,
    attachment.fileSizeBytes,
  );
  TestValidator.equals(
    "checksum sha256 matches",
    retrieved.checksumSha256,
    attachment.checksumSha256,
  );
  TestValidator.equals(
    "createdAt matches",
    retrieved.createdAt,
    attachment.createdAt,
  );
  TestValidator.equals(
    "updatedAt matches",
    retrieved.updatedAt,
    attachment.updatedAt,
  );
}
