import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditLikeAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeAttachment";
import type { IRedditLikeAttachmentThumbnail } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeAttachmentThumbnail";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import type { IRedditLikeOwner } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeOwner";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { authorize_owner_join } from "../../../authorize/authorize_owner_join";
import { authorize_owner_login } from "../../../authorize/authorize_owner_login";
import { authorize_owner_refresh } from "../../../authorize/authorize_owner_refresh";
import { generate_random_reddit_like_member_attachments_create } from "../../../generate/generate_random_reddit_like_member_attachments_create";
import { generate_random_reddit_like_owner_attachments_generate_thumbnails_generate_thumbnails } from "../../../generate/generate_random_reddit_like_owner_attachments_generate_thumbnails_generate_thumbnails";
import { prepare_random_reddit_like_attachment } from "../../../prepare/prepare_random_reddit_like_attachment";
import { prepare_random_reddit_like_attachment_thumbnail } from "../../../prepare/prepare_random_reddit_like_attachment_thumbnail";

export async function test_api_attachment_thumbnail_webp_format_optimization(
  connection: api.IConnection,
): Promise<void> {
  // Create actor-specific connections for isolation pattern
  const memberConnection: api.IConnection = { host: connection.host };
  const ownerConnection: api.IConnection = { host: connection.host };
  // 1. Authenticate as member to upload attachment
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: RandomGenerator.name(),
      password: RandomGenerator.alphaNumeric(16),
    },
  });
  // 2. Authenticate as owner for thumbnail generation
  await authorize_owner_join(ownerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      nickname: RandomGenerator.name(),
    },
  });
  // 3. Upload an image attachment as member
  const attachment =
    await generate_random_reddit_like_member_attachments_create(
      memberConnection,
      {
        body: {
          fileUri: typia.random<string & tags.Format<"uri">>(),
          originalFilename: RandomGenerator.name(),
        },
      },
    );
  typia.assert(attachment);
  // 4. Generate thumbnail with WebP format, 150x150, quality 90%
  const thumbnail =
    await generate_random_reddit_like_owner_attachments_generate_thumbnails_generate_thumbnails(
      ownerConnection,
      {
        params: {
          attachmentId: attachment.id,
        },
        body: {
          width: 150,
          height: 150,
          quality: 90,
          format: "webp",
        },
      },
    );
  typia.assert(thumbnail);
  // 5. Validate WebP format acceptance and metadata correctness
  TestValidator.equals("thumbnail format is webp", thumbnail.format, "webp");
  TestValidator.equals("thumbnail width matches", thumbnail.width, 150);
  TestValidator.equals("thumbnail height matches", thumbnail.height, 150);
  TestValidator.equals("thumbnail quality matches", thumbnail.quality, 90);
  TestValidator.equals(
    "thumbnail attachmentId matches",
    thumbnail.attachmentId,
    attachment.id,
  );
  // 6. Validate file metadata for optimization benefits
  TestValidator.predicate(
    "thumbnail fileSize is positive",
    thumbnail.fileSize > 0,
  );
  TestValidator.predicate(
    "thumbnail fileSize smaller than original (WebP compression benefit)",
    thumbnail.fileSize < attachment.fileSizeBytes,
  );
}
