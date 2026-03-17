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

export async function test_api_thumbnail_retrieval_success(
  connection: api.IConnection,
) {
  // 1. Create member connection and authenticate
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: RandomGenerator.name(1),
      password: RandomGenerator.alphaNumeric(16),
    },
  });
  // 2. Create an image attachment using the utility function
  const attachment =
    await generate_random_reddit_like_member_attachments_create(
      memberConnection,
      {
        body: {
          fileUri: typia.random<string & tags.Format<"uri">>(),
          originalFilename: RandomGenerator.name(2),
        },
      },
    );
  typia.assert(attachment);
  // 3. Generate thumbnail with specific parameters: 200x200, quality 80, format webp
  const thumbnail =
    await generate_random_reddit_like_member_attachments_generate_thumbnails_generate_thumbnails(
      memberConnection,
      {
        params: {
          attachmentId: attachment.id,
        },
        body: {
          width: 200,
          height: 200,
          quality: 80,
          format: "webp",
        },
      },
    );
  typia.assert(thumbnail);
  // 4. Retrieve the thumbnail using the SDK function
  const retrievedThumbnail =
    await api.functional.redditLike.attachments.thumbnails.at(
      memberConnection,
      {
        attachmentId: attachment.id,
        thumbnailId: thumbnail.id,
      },
    );
  // 5. Validate the response using typia.assert
  typia.assert(retrievedThumbnail);
  // 6. Validate business logic values match the created thumbnail
  TestValidator.equals(
    "thumbnail id matches",
    retrievedThumbnail.id,
    thumbnail.id,
  );
  TestValidator.equals(
    "attachment id matches",
    retrievedThumbnail.attachmentId,
    attachment.id,
  );
  TestValidator.equals(
    "width matches",
    retrievedThumbnail.width,
    thumbnail.width,
  );
  TestValidator.equals(
    "height matches",
    retrievedThumbnail.height,
    thumbnail.height,
  );
  TestValidator.equals(
    "quality matches",
    retrievedThumbnail.quality,
    thumbnail.quality,
  );
  TestValidator.equals(
    "format matches",
    retrievedThumbnail.format,
    thumbnail.format,
  );
  TestValidator.equals(
    "storage path matches",
    retrievedThumbnail.storagePath,
    thumbnail.storagePath,
  );
}
