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
 * Test thumbnail generation with alternative format (webp) and high quality settings.
 * A member uploads an image attachment, then generates a thumbnail with webp format
 * and maximum quality (100). Verify that the system correctly generates a webp-formatted
 * thumbnail with superior compression efficiency, the quality setting is preserved at
 * maximum value, and the returned file size reflects the high-quality encoding.
 */
export async function test_api_attachment_thumbnail_generation_webp_high_quality(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create authenticated member connection
  const memberConnection: api.IConnection = { host: connection.host };
  const member: IRedditLikeMember.IAuthorized = await authorize_member_join(
    memberConnection,
    {
      body: {},
    },
  );
  typia.assert(member);
  // Step 2: Upload an image attachment
  const attachment: IRedditLikeAttachment =
    await generate_random_reddit_like_member_attachments_create(
      memberConnection,
      {
        body: {},
      },
    );
  typia.assert(attachment);
  // Step 3: Generate thumbnail with webp format and quality 100
  const thumbnail: IRedditLikeAttachmentThumbnail =
    await generate_random_reddit_like_member_attachments_generate_thumbnails_generate_thumbnails(
      memberConnection,
      {
        params: {
          attachmentId: attachment.id,
        },
        body: {
          width: typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>(),
          height: typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>(),
          quality: 100,
          format: "webp",
        } satisfies IRedditLikeAttachmentThumbnail.ICreate,
      },
    );
  typia.assert(thumbnail);
  // Step 4: Validate thumbnail properties
  TestValidator.equals("format is webp", thumbnail.format, "webp");
  TestValidator.equals("quality is 100", thumbnail.quality, 100);
  TestValidator.predicate("file size is positive", thumbnail.fileSize > 0);
  TestValidator.predicate(
    "attachment ID matches",
    thumbnail.attachmentId === attachment.id,
  );
}
