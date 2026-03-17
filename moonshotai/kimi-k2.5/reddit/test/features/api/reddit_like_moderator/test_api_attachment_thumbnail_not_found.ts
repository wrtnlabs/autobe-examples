import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditLikeAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeAttachment";
import type { IRedditLikeAttachmentThumbnail } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeAttachmentThumbnail";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import type { IRedditLikeModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeModerator";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_moderator_join } from "../../../authorize/authorize_moderator_join";
import { authorize_moderator_login } from "../../../authorize/authorize_moderator_login";
import { authorize_moderator_refresh } from "../../../authorize/authorize_moderator_refresh";
import { generate_random_reddit_like_moderator_attachments_generate_thumbnails_generate_thumbnails } from "../../../generate/generate_random_reddit_like_moderator_attachments_generate_thumbnails_generate_thumbnails";
import { prepare_random_reddit_like_attachment_thumbnail } from "../../../prepare/prepare_random_reddit_like_attachment_thumbnail";

/**
 * Error scenario when attempting to generate a thumbnail for a non-existent attachment.
 * A moderator attempts to generate a thumbnail using a random UUID that does not
 * correspond to any uploaded attachment in the system. The system should reject
 * the request with an appropriate error indicating the attachment was not found.
 * This validates the attachment existence check before attempting thumbnail generation.
 */
export async function test_api_attachment_thumbnail_not_found(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as moderator using utility function
  const moderatorConnection: api.IConnection = { host: connection.host };
  await authorize_moderator_join(moderatorConnection, {});
  // 2. Attempt to generate thumbnail for non-existent attachment with random UUID
  const nonExistentAttachmentId = typia.random<string & tags.Format<"uuid">>();
  const thumbnailBody: IRedditLikeAttachmentThumbnail.ICreate = {
    width: typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>(),
    height: typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>(),
    quality: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
    >(),
    format: typia.random<"jpeg" | "png" | "webp">(),
  };
  // 3. Verify the system returns 404 Not Found for non-existent attachment
  await TestValidator.httpError(
    "should return 404 for non-existent attachment",
    404,
    async () => {
      await api.functional.redditLike.moderator.attachments.generate_thumbnails.generateThumbnails(
        moderatorConnection,
        {
          attachmentId: nonExistentAttachmentId,
          body: thumbnailBody,
        },
      );
    },
  );
}
