import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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
import { generate_random_reddit_like_member_attachments_generate_thumbnails_generate_thumbnails } from "../../../generate/generate_random_reddit_like_member_attachments_generate_thumbnails_generate_thumbnails";
import { prepare_random_reddit_like_attachment_thumbnail } from "../../../prepare/prepare_random_reddit_like_attachment_thumbnail";

/**
 * Test error handling when attempting to generate a thumbnail for a non-existent attachment.
 *
 * 1. A member joins and authenticates
 * 2. Attempt to generate thumbnail with a random UUID that doesn't exist
 * 3. Verify the system returns an appropriate HTTP error (404)
 * 4. Validate that no thumbnail record was created
 */
export async function test_api_attachment_thumbnail_generation_nonexistent_attachment(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create a member-specific connection and authenticate
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {},
  });
  // 2. Generate a random UUID for a non-existent attachment
  const nonExistentAttachmentId = typia.random<string & tags.Format<"uuid">>();
  // 3. Attempt to generate thumbnail for non-existent attachment with valid body
  const thumbnailBody = {
    width: 150,
    height: 150,
    quality: 80,
    format: "jpeg" as const,
  } satisfies IRedditLikeAttachmentThumbnail.ICreate;
  // 4. Should return 404 error for non-existent attachment
  await TestValidator.httpError(
    "should return 404 for non-existent attachment",
    404,
    async () => {
      await api.functional.redditLike.member.attachments.generate_thumbnails.generateThumbnails(
        memberConnection,
        {
          attachmentId: nonExistentAttachmentId,
          body: thumbnailBody,
        },
      );
    },
  );
}
