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

export async function test_api_thumbnail_retrieval_not_found(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as a member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // 2. Upload an image file attachment
  const attachment =
    await generate_random_reddit_like_member_attachments_create(
      memberConnection,
      {},
    );
  // 3. Generate a thumbnail variant
  await generate_random_reddit_like_member_attachments_generate_thumbnails_generate_thumbnails(
    memberConnection,
    {
      params: {
        attachmentId: attachment.id,
      },
    },
  );
  // 4. Generate a non-existent thumbnailId (valid UUID format but doesn't exist)
  const nonExistentThumbnailId = typia.random<string & tags.Format<"uuid">>();
  // 5. Call GET endpoint with valid attachmentId but invalid thumbnailId
  // Should return HTTP 404 Not Found
  await TestValidator.httpError(
    "should return 404 for non-existent thumbnail",
    404,
    async () => {
      await api.functional.redditLike.attachments.thumbnails.at(
        memberConnection,
        {
          attachmentId: attachment.id,
          thumbnailId: nonExistentThumbnailId,
        },
      );
    },
  );
}
