import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditLikeAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeAttachment";
import type { IRedditLikeAttachmentThumbnail } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeAttachmentThumbnail";
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
import { generate_random_reddit_like_member_attachments_generate_thumbnails_generate_thumbnails } from "../../../generate/generate_random_reddit_like_member_attachments_generate_thumbnails_generate_thumbnails";
import { prepare_random_reddit_like_attachment } from "../../../prepare/prepare_random_reddit_like_attachment";
import { prepare_random_reddit_like_attachment_thumbnail } from "../../../prepare/prepare_random_reddit_like_attachment_thumbnail";

/**
 * Test successful thumbnail generation for an uploaded image attachment.
 * A member uploads an image file, then generates a thumbnail with standard parameters (width: 300, height: 200, quality: 80, format: jpeg).
 * Verify that the thumbnail is created with correct dimensions, the response includes proper storage path and file size metadata,
 * and the thumbnail record is persisted. Validate that the generated thumbnail maintains aspect ratio if specified and
 * the file format matches the requested output format.
 */
export async function test_api_attachment_thumbnail_generation_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member connection and authenticate
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, { body: {} });
  // 2. Create an image attachment
  const attachment =
    await generate_random_reddit_like_member_attachments_create(
      memberConnection,
      { body: {} },
    );
  typia.assert(attachment);
  // 3. Generate thumbnail with standard parameters (width: 300, height: 200, quality: 80, format: jpeg)
  const thumbnailRequest = {
    width: 300,
    height: 200,
    quality: 80,
    format: "jpeg",
  } satisfies IRedditLikeAttachmentThumbnail.ICreate;
  const thumbnail =
    await generate_random_reddit_like_member_attachments_generate_thumbnails_generate_thumbnails(
      memberConnection,
      {
        params: { attachmentId: attachment.id },
        body: thumbnailRequest,
      },
    );
  typia.assert(thumbnail);
  // 4. Validate thumbnail response matches requested parameters
  TestValidator.equals(
    "thumbnail width matches request",
    thumbnail.width,
    thumbnailRequest.width,
  );
  TestValidator.equals(
    "thumbnail height matches request",
    thumbnail.height,
    thumbnailRequest.height,
  );
  TestValidator.equals(
    "thumbnail quality matches request",
    thumbnail.quality,
    thumbnailRequest.quality,
  );
  TestValidator.equals(
    "thumbnail format matches request",
    thumbnail.format,
    thumbnailRequest.format,
  );
  TestValidator.equals(
    "thumbnail attachmentId matches source",
    thumbnail.attachmentId,
    attachment.id,
  );
  // 5. Validate thumbnail has required metadata (business logic, not type validation - typia.assert already validated types)
  TestValidator.predicate(
    "thumbnail has storage path",
    thumbnail.storagePath.length > 0,
  );
  TestValidator.predicate(
    "thumbnail has valid file size",
    thumbnail.fileSize > 0,
  );
}
