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

export async function test_api_attachment_thumbnail_generation_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member and upload attachment
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {});
  typia.assert(member);
  const attachment =
    await generate_random_reddit_like_member_attachments_create(
      memberConnection,
      {},
    );
  typia.assert(attachment);
  // 2. Create owner connection and authenticate
  const ownerConnection: api.IConnection = { host: connection.host };
  const owner = await authorize_owner_join(ownerConnection, {});
  typia.assert(owner);
  // 3. Generate thumbnail with specific dimensions (300x200), quality 80%, jpeg format
  const thumbnailBody = {
    width: 300,
    height: 200,
    quality: 80,
    format: "jpeg" as const,
  } satisfies IRedditLikeAttachmentThumbnail.ICreate;
  const thumbnail =
    await generate_random_reddit_like_owner_attachments_generate_thumbnails_generate_thumbnails(
      ownerConnection,
      {
        params: { attachmentId: attachment.id },
        body: thumbnailBody,
      },
    );
  typia.assert(thumbnail);
  // 4. Verify thumbnail metadata matches the requested specifications
  TestValidator.equals(
    "thumbnail references original attachment",
    thumbnail.attachmentId,
    attachment.id,
  );
  TestValidator.equals("thumbnail width matches request", thumbnail.width, 300);
  TestValidator.equals(
    "thumbnail height matches request",
    thumbnail.height,
    200,
  );
  TestValidator.equals(
    "thumbnail quality matches request",
    thumbnail.quality,
    80,
  );
  TestValidator.equals("thumbnail format is jpeg", thumbnail.format, "jpeg");
  TestValidator.predicate(
    "thumbnail has valid storage path",
    thumbnail.storagePath.length > 0,
  );
  TestValidator.predicate(
    "thumbnail file size is positive",
    thumbnail.fileSize > 0,
  );
  TestValidator.predicate(
    "thumbnail createdAt is valid",
    thumbnail.createdAt.length > 0,
  );
}
